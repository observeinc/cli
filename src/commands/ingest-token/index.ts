import { defineRoutes } from "../../lib/stricli-wrappers";
import { createCommand } from "./create";
import { viewCommand } from "./view";
import { listCommand } from "./list";
import { updateCommand } from "./update";
import { deleteCommand } from "./delete";

export const ingestTokenRoutes = defineRoutes({
  routes: {
    create: createCommand,
    view: viewCommand,
    list: listCommand,
    update: updateCommand,
    delete: deleteCommand,
  },
  docs: {
    brief: "Manage ingest tokens",
    fullDescription:
      "Create, read, update, list, and delete ingest tokens in Observe.",
  },
});
