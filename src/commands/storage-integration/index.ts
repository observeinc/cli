import { defineRoutes } from "../../lib/stricli-wrappers";
import { listCommand } from "./list";
import { viewCommand } from "./view";

export const storageIntegrationRoutes = defineRoutes({
  routes: {
    list: listCommand,
    view: viewCommand,
  },
  docs: {
    brief: "Manage storage integrations",
    fullDescription:
      "List and view storage integrations. An Iceberg source dataset needs one of these ids as --storage-integration-id.",
  },
});
