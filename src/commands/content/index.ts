import { defineRoutes } from "../../lib/stricli-wrappers";
import { hostContentRoutes } from "./host/index";
import { kubernetesContentRoutes } from "./kubernetes/index";
import { tracingContentRoutes } from "./tracing/index";

export const contentRoutes = defineRoutes({
  routes: {
    host: hostContentRoutes,
    kubernetes: kubernetesContentRoutes,
    tracing: tracingContentRoutes,
  },
  docs: {
    brief: "Manage installed content",
    fullDescription: "Install and view content packs in Observe.",
  },
});
