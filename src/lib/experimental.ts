/**
 * The "experimental command" feature.
 *
 * An experimental command is hidden from help and refuses to run unless
 * `OBSERVE_CLI_EXPERIMENTAL=1`, and shows an `[experimental]` badge when
 * visible. A route group becomes experimental automatically once all of its
 * children are.
 *
 * Developers opt in by setting `experimental: true` on `defineCommand`; they
 * never import this module directly. The thin wrappers in ./stricli-wrappers.ts
 * call the helpers below to badge and gate the command, to record it in a
 * registry (a route can't hide itself, so its parent route map does the
 * hiding), and to compute that parent's list of hidden routes.
 */

import {
  type BaseArgs,
  type BaseFlags,
  type CommandBuilderArguments,
  type CommandFunction,
  type CommandFunctionLoader,
  type RouteMapBuilderArguments,
} from "@stricli/core";
import type { LocalContext } from "../context.js";
import { yellow } from "./formatters/colors.js";

export const EXPERIMENTAL_ENV_VAR = "OBSERVE_CLI_EXPERIMENTAL";

/** Whether the current process has opted into experimental commands. */
export function isExperimentalEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const raw = env[EXPERIMENTAL_ENV_VAR]?.trim().toLowerCase();
  return raw === "1" || raw === "true";
}

const BADGE = yellow("[experimental]");

function badge(brief: string): string {
  return `${BADGE} ${brief}`;
}

function disabledMessage(): string {
  return (
    "This command is experimental and may change or be removed. " +
    `Set ${EXPERIMENTAL_ENV_VAR}=1 to enable it.`
  );
}

// Commands/groups marked experimental register here so a parent route map can
// detect them: a route cannot hide itself, so hiding is the parent's job.
const registry = new WeakSet<object>();

/** Register a target (command or route map) as experimental. */
export function markExperimental(target: object): void {
  registry.add(target);
}

export function isExperimental(target: object): boolean {
  return registry.has(target);
}

function isAllExperimental(routes: object): boolean {
  const targets = Object.values(routes);
  return (
    targets.length > 0 && targets.every((t) => isExperimental(t as object))
  );
}

/**
 * Badge the brief and wrap the loader so the command refuses to run unless the
 * flag is set. The wrapper calls this only for experimental commands. Accepts
 * either builder form (`loader` or inline `func`).
 */
export function processExperimentalCommandArgs<
  FLAGS extends BaseFlags,
  ARGS extends BaseArgs,
  CONTEXT extends LocalContext,
>(
  args: CommandBuilderArguments<FLAGS, ARGS, CONTEXT>,
): CommandBuilderArguments<FLAGS, ARGS, CONTEXT> {
  const loadAction: CommandFunctionLoader<FLAGS, ARGS, CONTEXT> =
    "loader" in args ? args.loader : () => Promise.resolve(args.func);

  return {
    parameters: args.parameters,
    docs: { ...args.docs, brief: badge(args.docs.brief) },
    loader: async () => {
      const loaded = await loadAction();
      const fn: CommandFunction<FLAGS, ARGS, CONTEXT> =
        typeof loaded === "function" ? loaded : loaded.default;
      return function (this: CONTEXT, flags: FLAGS, ...rest: ARGS) {
        if (!isExperimentalEnabled()) {
          this.writer.error(disabledMessage());
          this.process.exit(1);
          return;
        }
        return fn.call(this, flags, ...rest);
      };
    },
  };
}

/** Register a built command as experimental so its parent route map hides it. */
export function registerExperimentalCommand<C extends object>(
  command: C,
  experimental: boolean | undefined,
): C {
  if (experimental) markExperimental(command);
  return command;
}

/**
 * Build the route-map docs: hide experimental children from help, and badge the
 * group brief when *every* child is experimental (so the group reads as
 * experimental wherever it is shown).
 */
export function experimentalRouteDocs<
  R extends string,
  CONTEXT extends LocalContext,
>(
  routes: RouteMapBuilderArguments<R, CONTEXT>["routes"],
  docs: RouteMapBuilderArguments<R, CONTEXT>["docs"],
): RouteMapBuilderArguments<R, CONTEXT>["docs"] {
  const enabled = isExperimentalEnabled();
  const hideRoute: Partial<Record<R, boolean>> = { ...docs.hideRoute };
  for (const [name, target] of Object.entries(routes)) {
    if (isExperimental(target as object)) {
      hideRoute[name as R] = !enabled;
    }
  }
  const brief = isAllExperimental(routes) ? badge(docs.brief) : docs.brief;
  return { ...docs, brief, hideRoute };
}

/**
 * Register a built route map as experimental when every child is experimental,
 * so its own parent hides it. This is what makes experimental-ness bubble up.
 */
export function registerExperimentalGroup<M extends object>(
  map: M,
  routes: object,
): M {
  if (isAllExperimental(routes)) markExperimental(map);
  return map;
}
