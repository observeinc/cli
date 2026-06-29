import { defineRoutes } from "../../lib/stricli-wrappers";
import { listCommand } from "./list";
import { viewCommand } from "./view";

export const datasetRoutes = defineRoutes({
  routes: {
    list: listCommand,
    view: viewCommand,
  },
  docs: {
    brief: "View observe datasets",
    fullDescription: "View and manage datasets in Observe.",
  },
});
