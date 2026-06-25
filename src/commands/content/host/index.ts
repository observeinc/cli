import { buildRouteMap } from "@stricli/core";
import { withExperimentalBadge } from "../../../lib/experimental";
import { installCommand } from "./install";
import { viewCommand } from "./view";

export const hostContentRoutes = buildRouteMap({
  routes: {
    install: installCommand,
    view: viewCommand,
  },
  docs: {
    brief: withExperimentalBadge("Manage Host Explorer content"),
  },
});
