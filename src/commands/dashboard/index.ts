import { defineRoutes } from "../../lib/stricli-wrappers";
import { createCommand } from "./create";
import { deleteCommand } from "./delete";
import { listCommand } from "./list";
import { updateCommand } from "./update";
import { viewCommand } from "./view";

export const dashboardRoutes = defineRoutes({
  routes: {
    list: listCommand,
    view: viewCommand,
    create: createCommand,
    update: updateCommand,
    delete: deleteCommand,
  },
  docs: {
    brief: "Manage dashboards",
    fullDescription: [
      "List, view, create, update, and delete dashboards in Observe.",
      "",
      "Create and update take the dashboard document as a JSON file; use",
      "'observe dashboard view <id> --json' to get an editable copy.",
    ].join("\n"),
  },
});
