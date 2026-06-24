import { buildRouteMap } from "@stricli/core";
import { monitorMuteRoutes } from "./mute/index";

export const monitorRoutes = buildRouteMap({
  routes: {
    mute: monitorMuteRoutes,
  },
  docs: {
    brief: "Manage monitors",
    fullDescription: [
      "Manage monitors in Observe.",
      "",
      "Commands:",
      "  mute   Manage monitor mute rules (snoozes)",
    ].join("\n"),
  },
});
