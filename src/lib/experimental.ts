/**
 * Experimental command gating.
 *
 * Experimental commands are hidden behind the `OBSERVE_CLI_EXPERIMENTAL=1`
 * environment variable and carry an `[experimental]` badge when visible.
 *
 * To mark a command experimental:
 *   1. `loader: async () => gateExperimental(handler)` — blocks execution.
 *   2. `docs.brief: withExperimentalBadge("...")` — adds the badge.
 *   3. parent route map `docs.hideRoute: hideExperimentalRoutes(["name"])` —
 *      hides it from help.
 * Promoting to GA = removing these three markers.
 */

import type { LocalContext } from "../context.js";
import { yellow } from "./formatters/colors.js";

/** Environment variable that opts a session into experimental CLI commands. */
export const EXPERIMENTAL_ENV_VAR = "OBSERVE_CLI_EXPERIMENTAL";

/** Badge prefixed onto the brief of an experimental command/route. */
export const EXPERIMENTAL_BADGE = yellow("[experimental]");

/**
 * Whether the current process has opted into experimental commands. Accepts
 * `1` or `true` (case-insensitive, surrounding whitespace ignored).
 */
export function isExperimentalEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const raw = env[EXPERIMENTAL_ENV_VAR]?.trim().toLowerCase();
  return raw === "1" || raw === "true";
}

/** Prefix a command/route `brief` with the `[experimental]` badge. */
export function withExperimentalBadge(brief: string): string {
  return `${EXPERIMENTAL_BADGE} ${brief}`;
}

/**
 * Build a `docs.hideRoute` map that hides the named routes from help unless
 * the experimental flag is set.
 */
export function hideExperimentalRoutes(
  names: string[],
  env: NodeJS.ProcessEnv = process.env,
): Record<string, boolean> {
  const hidden = !isExperimentalEnabled(env);
  return Object.fromEntries(names.map((name) => [name, hidden]));
}

/** Friendly message shown when a gated command is run without the flag. */
export function experimentalDisabledMessage(): string {
  return (
    "This command is experimental and may change or be removed. " +
    `Set ${EXPERIMENTAL_ENV_VAR}=1 to enable it.`
  );
}

/**
 * Wrap a stricli command handler so it refuses to run unless the experimental
 * flag is set.
 */
export function gateExperimental<A extends unknown[]>(
  handler: (this: LocalContext, ...args: A) => Promise<void> | void,
  env: NodeJS.ProcessEnv = process.env,
) {
  return async function (this: LocalContext, ...args: A): Promise<void> {
    if (!isExperimentalEnabled(env)) {
      this.writer.error(experimentalDisabledMessage());
      this.process.exit(1);
      return;
    }
    await handler.apply(this, args);
  };
}
