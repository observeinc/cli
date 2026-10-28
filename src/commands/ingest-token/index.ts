import { defineRoutes } from "../../lib/stricli-wrappers";
import { createCommand } from "./create";
import { viewCommand } from "./view";
import { listCommand } from "./list";
import { updateCommand } from "./update";
import { revokeCommand } from "./revoke";

export const ingestTokenRoutes = defineRoutes({
  routes: {
    create: createCommand,
    view: viewCommand,
    list: listCommand,
    update: updateCommand,
    revoke: revokeCommand,
  },
  docs: {
    brief: "Manage ingest tokens",
    fullDescription:
      "Create, read, update, list, and revoke ingest tokens in Observe.",
  },
});
