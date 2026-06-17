import { buildCommand } from "@stricli/core";
import chalk from "chalk";
import {
  accessSync,
  chmodSync,
  constants as fsConstants,
  existsSync,
  renameSync,
  unlinkSync,
} from "node:fs";
import { dirname, join } from "node:path";
import type { LocalContext } from "../../context";
import { detectPlatform, downloadReleaseBinary } from "../../lib/binary";
import { fetchLatestRelease } from "../../lib/github-release";
import { CURRENT_CLI_VERSION, INSTALL_SCRIPT_URL } from "../../lib/constants";
import { loadState, saveState } from "../../lib/state";
import { trace } from "@opentelemetry/api";

interface UpgradeFlags {
  force?: boolean;
}

// TODO: Detect npm installs (via postinstall hook) and direct users
// to `npm update -g observe` instead of self-upgrading.

function isPermissionError(err: unknown): err is NodeJS.ErrnoException {
  return (
    err instanceof Error &&
    ((err as NodeJS.ErrnoException).code === "EACCES" ||
      (err as NodeJS.ErrnoException).code === "EPERM")
  );
}

/**
 * Build an actionable error for the common case where the binary lives in a
 * directory the current user can't write to (e.g. `/usr/local/bin` owned by
 * root). Self-upgrading there requires elevated privileges, so we point users
 * at the two reliable ways to proceed.
 */
function permissionDeniedError(targetPath: string) {
  return new Error(
    `Cannot upgrade observe at ${targetPath}: permission denied.\n\n` +
      "This location requires elevated permissions to modify. Try one of:\n" +
      `  • Re-run with sudo:  sudo observe cli upgrade\n` +
      `  • Reinstall to a user-writable directory:\n` +
      `      curl -fsSL ${INSTALL_SCRIPT_URL} | bash`,
  );
}

async function upgrade(this: LocalContext, flags: UpgradeFlags) {
  const { process: proc, writer } = this;
  const state = loadState();

  writer.info("Checking for updates...");

  const latest = await fetchLatestRelease();

  if (latest.version === CURRENT_CLI_VERSION && !flags.force) {
    writer.success(`Already up to date (v${CURRENT_CLI_VERSION})`);
    return;
  }

  writer.write(
    `Upgrading observe: ${CURRENT_CLI_VERSION} ${chalk.dim("->")} ${chalk.green(latest.version)}`,
  );

  const { platform, arch } = detectPlatform();
  const targetPath = state.installPath ?? proc.execPath;
  const targetDir = dirname(targetPath);

  // Fail fast (before downloading) if we can't write into the install
  // directory. The atomic swap below renames within this directory, so write
  // access here is what actually matters — not access to the binary file.
  try {
    accessSync(targetDir, fsConstants.W_OK);
  } catch (accessErr) {
    if (isPermissionError(accessErr)) {
      throw permissionDeniedError(targetPath);
    }
    throw accessErr;
  }

  // Stage the download in the same directory as the target so the final swap
  // is an atomic, same-filesystem rename. Using the OS temp dir risks a
  // cross-device rename (EXDEV) failure when /tmp lives on another volume.
  const tmpPath = join(targetDir, `.observe-upgrade-${String(Date.now())}`);

  try {
    writer.info(`Downloading observe-${platform}-${arch}...`);
    await downloadReleaseBinary({
      tag: latest.tag,
      platform,
      arch,
      destPath: tmpPath,
    });

    chmodSync(tmpPath, 0o755);

    // Safe binary swap: rename old to .bak, move new into place, then
    // delete .bak. If the rename fails, the .bak is restored so the
    // user is never left without a working binary.
    const backupPath = targetPath + ".bak";

    try {
      if (existsSync(targetPath)) {
        renameSync(targetPath, backupPath);
      }
      renameSync(tmpPath, targetPath);
    } catch (swapErr) {
      // Restore backup if the new binary didn't land
      if (existsSync(backupPath) && !existsSync(targetPath)) {
        renameSync(backupPath, targetPath);
      }
      if (isPermissionError(swapErr)) {
        throw permissionDeniedError(targetPath);
      }
      throw swapErr;
    }

    try {
      unlinkSync(backupPath);
    } catch {
      // .bak cleanup is best-effort
    }

    saveState({
      installedVersion: latest.version,
      installedAt: new Date().toISOString(),
      latestKnownVersion: latest.version,
      latestReleaseUrl: latest.url,
      lastUpdateCheck: new Date().toISOString(),
    });

    writer.success(`Successfully upgraded to v${latest.version}`);

    const span = trace.getActiveSpan();
    if (span) {
      span.setAttributes({
        "cli.upgrade.from_version": CURRENT_CLI_VERSION,
        "cli.upgrade.to_version": latest.version,
        "cli.upgrade.forced": flags.force ?? false,
      });
    }
  } catch (err) {
    try {
      unlinkSync(tmpPath);
    } catch {
      // ignore cleanup failure
    }
    throw err;
  }
}

export const upgradeCommand = buildCommand({
  loader: async () => upgrade,
  parameters: {
    flags: {
      force: {
        kind: "boolean",
        brief: "Force upgrade even if already on the latest version",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Upgrade the Observe CLI to the latest version",
    fullDescription:
      "Downloads and installs the latest version of the Observe CLI " +
      "from GitHub Releases.\n\n" +
      "Examples:\n" +
      "  observe cli upgrade          # Upgrade to latest\n" +
      "  observe cli upgrade --force  # Re-download even if up to date",
  },
});
