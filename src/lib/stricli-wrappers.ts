/**
 * Thin, feature-agnostic wrappers over stricli's `buildCommand` /
 * `buildRouteMap`. Use these for ALL commands and route maps.
 *
 * The wrappers own the set of custom declarative fields (below) and decide,
 * per field, whether to call into that field's feature module for the actual
 * logic (currently ./experimental.ts). New cross-cutting fields are added here:
 * extend the options type and dispatch on it.
 */

import {
  buildCommand,
  buildRouteMap,
  type BaseArgs,
  type Command,
  type CommandBuilderArguments,
  type RouteMap,
  type RouteMapBuilderArguments,
} from "@stricli/core";
import type { LocalContext } from "../context.js";
import {
  experimentalRouteDocs,
  markExperimental,
  processExperimentalCommandArgs,
  registerExperimentalGroup,
} from "./experimental.js";

/** Custom declarative fields understood by `defineCommand`. */
interface CustomCommandFields {
  /** Hide + gate behind OBSERVE_CLI_EXPERIMENTAL=1 and badge as `[experimental]`. */
  readonly experimental?: boolean;
}

/** Drop-in replacement for `buildCommand` that understands custom fields. */
export function defineCommand<
  const FLAGS extends Readonly<Partial<Record<keyof FLAGS, unknown>>> =
    NonNullable<unknown>,
  const ARGS extends BaseArgs = [],
  const CONTEXT extends LocalContext = LocalContext,
>(
  args: CommandBuilderArguments<FLAGS, ARGS, CONTEXT> & CustomCommandFields,
): Command<CONTEXT> {
  // Each custom field gets a "before" block to transform the builder args
  // and/or an "after" block for work that needs the built command (only the
  // blocks a field actually needs are present).
  let builderArgs: CommandBuilderArguments<FLAGS, ARGS, CONTEXT> = args;

  if (args.experimental) {
    // hide + gate + badge the command
    builderArgs = processExperimentalCommandArgs(builderArgs);
  }

  const command = buildCommand<FLAGS, ARGS, CONTEXT>(builderArgs);

  if (args.experimental) {
    // register so the parent route map hides it
    markExperimental(command);
  }

  return command;
}

/**
 * Drop-in replacement for `buildRouteMap` that understands custom fields. Same
 * before/after-build pipeline as `defineCommand`; a route map carries no custom
 * field of its own, so its steps run unconditionally.
 */
export function defineRoutes<
  const R extends string,
  CONTEXT extends LocalContext = LocalContext,
>(args: RouteMapBuilderArguments<R, CONTEXT>): RouteMap<CONTEXT> {
  let builderArgs: RouteMapBuilderArguments<R, CONTEXT> = args;

  // experimental: hide experimental children, and badge the group when every
  // child is experimental.
  builderArgs = {
    ...builderArgs,
    docs: experimentalRouteDocs<R, CONTEXT>(
      builderArgs.routes,
      builderArgs.docs,
    ),
  };

  const map = buildRouteMap<R, CONTEXT>(builderArgs);

  // experimental: mark the group experimental when every child is, so this
  // map's own parent hides it.
  registerExperimentalGroup(map, builderArgs.routes);

  return map;
}
