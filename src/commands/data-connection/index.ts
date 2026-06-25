import { defineRoutes } from "../../lib/stricli-wrappers";
import { createConnectionRoutes } from "./create/index.js";
import { generateStackUrlCommand } from "./generate-stack-url.js";
import { listCommand } from "./list.js";
import { viewCommand } from "./view.js";

export const dataConnectionRoutes = defineRoutes({
  routes: {
    create: createConnectionRoutes,
    "generate-stack-url": generateStackUrlCommand,
    list: listCommand,
    view: viewCommand,
  },
  docs: {
    brief: "Manage data connections",
    fullDescription: [
      "Create, list, and view data connections in Observe.",
      "",
      "Each connection corresponds to a DataConnection in the Observe GraphQL API.",
      "After creating a connection, use 'observe datasource create' to attach datasources.",
    ].join("\n"),
  },
});
