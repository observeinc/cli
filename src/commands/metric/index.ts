import { defineRoutes } from "../../lib/stricli-wrappers";
import { listCommand } from "./list";
import { viewCommand } from "./view";

export const metricRoutes = defineRoutes({
  routes: {
    list: listCommand,
    view: viewCommand,
  },
  docs: {
    brief: "View observe metrics",
    fullDescription: [
      "View and manage metrics in Observe",
      "",
      "Commands:",
      "  list    Search and list metrics in Observe",
      "  view    View details of a specific metric",
    ].join("\n"),
  },
});
