import chalk from "chalk";
import { fetchLatestRelease } from "./github-release";
import { CURRENT_CLI_VERSION } from "./constants";
import { loadState, saveState } from "./state";

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

function isCliUpgradeCommand(args: readonly string[]) {
  const positional = args.filter((arg) => arg !== "--" && !arg.startsWith("-"));
  return positional[0] === "cli" && positional[1] === "upgrade";
}

function shouldCheckForUpdate({
  env,
  currentVersion,
}: {
  env: Record<string, string | undefined>;
  currentVersion: string;
}) {
  // Local dev builds don't have a meaningful version to compare against
  if (currentVersion === "0.0.0-dev") return false;

  // Explicit opt-out
  if (env.OBSERVE_NO_UPDATE_NOTIFIER) return false;

  // Non-interactive sessions (pipes, scripts, CI) don't need notifications
  try {
    if (!process.stderr.isTTY) return false;
  } catch {
    return false;
  }

  // Throttle to one network check per 24 hours
  const state = loadState();
  if (state.lastUpdateCheck) {
    const elapsed = Date.now() - new Date(state.lastUpdateCheck).getTime();
    if (elapsed < CHECK_INTERVAL_MS) return false;
  }

  return true;
}

function compareVersions(current: string, latest: string) {
  const parse = (v: string) => v.replace(/^v/, "").split(".").map(Number);
  const c = parse(current);
  const l = parse(latest);

  for (let i = 0; i < Math.max(c.length, l.length); i++) {
    const cv = c[i] ?? 0;
    const lv = l[i] ?? 0;
    if (lv > cv) return 1;
    if (lv < cv) return -1;
  }
  return 0;
}

async function cacheLatestRelease({ signal }: { signal?: AbortSignal } = {}) {
  const { version: latestVersion, url: releaseUrl } = await fetchLatestRelease({
    signal,
  });

  saveState({
    lastUpdateCheck: new Date().toISOString(),
    latestKnownVersion: latestVersion,
    latestReleaseUrl: releaseUrl,
  });
}

function formatUpdateMessage({
  currentVersion,
  latestVersion,
}: {
  currentVersion: string;
  latestVersion: string;
}) {
  const arrow = chalk.dim("->");
  return [
    "",
    chalk.yellow(
      `A new version of observe is available: ${currentVersion} ${arrow} ${chalk.green(latestVersion)}`,
    ),
    chalk.dim("Run `observe cli upgrade` to update"),
  ].join("\n");
}

/**
 * Decide at print time, not check-start time. `cli upgrade` replaces the
 * on-disk binary and records `installedVersion` while this process still
 * reports the old CURRENT_CLI_VERSION.
 */
function messageIfOutdated(currentVersion: string) {
  const state = loadState();
  const latestVersion = state.latestKnownVersion;
  if (!latestVersion) return null;

  if (
    state.installedVersion &&
    compareVersions(state.installedVersion, latestVersion) <= 0
  ) {
    return null;
  }

  if (compareVersions(currentVersion, latestVersion) > 0) {
    return formatUpdateMessage({ currentVersion, latestVersion });
  }

  return null;
}

export function startBackgroundUpdateCheck(
  env: Record<string, string | undefined>,
  options: { args?: readonly string[]; currentVersion?: string } = {},
) {
  const currentVersion = options.currentVersion ?? CURRENT_CLI_VERSION;
  const args = options.args ?? [];

  if (isCliUpgradeCommand(args)) {
    return { getResult: () => Promise.resolve(null) };
  }

  if (!shouldCheckForUpdate({ env, currentVersion })) {
    return {
      getResult: () => Promise.resolve(messageIfOutdated(currentVersion)),
    };
  }

  const abort = new AbortController();
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => {
      abort.abort();
      resolve(null);
    }, 150);
  });

  const pending = cacheLatestRelease({ signal: abort.signal })
    .then(() => true)
    .catch(() => false);

  return {
    getResult: async () => {
      const completed = await Promise.race([
        pending,
        timeoutPromise.then(() => false),
      ]);
      if (!completed) return null;
      return messageIfOutdated(currentVersion);
    },
  };
}
