import { buildRouteMap } from "@stricli/core";
import { viewCommand } from "./view";

export const workspaceRoutes = buildRouteMap({
  routes: {
    view: viewCommand,
  },
  docs: {
    brief: "View workspace information",
    fullDescription: "View workspace information including the workspace ID.",
  },
});
