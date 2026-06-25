import { buildRouteMap } from "@stricli/core";
import { withExperimentalBadge } from "../../lib/experimental";
import { hostContentRoutes } from "./host/index";
import { kubernetesContentRoutes } from "./kubernetes/index";
import { tracingContentRoutes } from "./tracing/index";

export const contentRoutes = buildRouteMap({
  routes: {
    host: hostContentRoutes,
    kubernetes: kubernetesContentRoutes,
    tracing: tracingContentRoutes,
  },
  docs: {
    // EXPERIMENTAL
    brief: withExperimentalBadge("Manage installed content"),
    fullDescription: "Install and view content packs in Observe.",
  },
});
