import { defineRoutes } from "../../lib/stricli-wrappers";
import { createCommand } from "./create";
import { viewCommand } from "./view";
import { listCommand } from "./list";
import { updateCommand } from "./update";

export const datastreamRoutes = defineRoutes({
  routes: {
    create: createCommand,
    view: viewCommand,
    list: listCommand,
    update: updateCommand,
  },
  docs: {
    brief: "Manage datastreams",
    fullDescription: "Create, read, update, and list datastreams in Observe.",
  },
});
