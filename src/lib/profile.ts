export const DEFAULT_PROFILE_NAME = "default";

const PROFILE_FLAGS = new Set(["--profile", "-P"]);

/**
 * Extract `--profile <name>` / `-P <name>` / `--profile=<name>` from argv
 * before Stricli sees it (Stricli has no native global-flag support).
 *
 * Returns the cleaned args array and the profile name if found.
 * Respects `--` (end-of-flags): anything after it is passed through untouched.
 * If the flag appears multiple times, the last one wins.
 */
export function extractProfileFlag(args: readonly string[]): {
  args: string[];
  profile: string | undefined;
} {
  const result: string[] = [];
  let profile: string | undefined;
  let pastEndOfFlags = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;

    if (pastEndOfFlags) {
      result.push(arg);
      continue;
    }

    if (arg === "--") {
      pastEndOfFlags = true;
      result.push(arg);
      continue;
    }

    if (arg.startsWith("--profile=")) {
      profile = arg.slice("--profile=".length);
      continue;
    }

    if (PROFILE_FLAGS.has(arg)) {
      const next = args[i + 1];
      if (next !== undefined) {
        profile = next;
        i++;
        continue;
      }
    }

    result.push(arg);
  }

  return { args: result, profile };
}
