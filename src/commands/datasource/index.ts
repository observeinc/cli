import { buildRouteMap } from "@stricli/core";
import { createDatasourceCommand } from "./create.js";
import { updateDatasourceCommand } from "./update.js";
import { createStackUrlCommand } from "./create-stack-url.js";

export const datasourceRoutes = buildRouteMap({
  routes: {
    create: createDatasourceCommand,
    update: updateDatasourceCommand,
    "create-stack-url": createStackUrlCommand,
  },
  docs: {
    brief: "Manage datasources",
    fullDescription: [
      "Create, update, and generate CloudFormation URLs for datasources.",
      "",
      "Each datasource belongs to a parent data connection. Use",
      "'observe data-connection view --name <name>' to find datasource IDs.",
    ].join("\n"),
  },
});
