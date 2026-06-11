import { buildRouteMap } from "@stricli/core";
import { createDatasourceCommand } from "./create.js";
import { updateDatasourceCommand } from "./update.js";
import { generateStackUrlCommand } from "./generate-stack-url.js";

export const datasourceRoutes = buildRouteMap({
  routes: {
    create: createDatasourceCommand,
    update: updateDatasourceCommand,
    "generate-stack-url": generateStackUrlCommand,
  },
  docs: {
    brief: "Manage datasources",
    fullDescription: [
      "Create, update, and generate CloudFormation URLs for datasources.",
      "",
      "Each datasource belongs to a parent data connection. Use",
      "'observe data-connection view <id>' to find datasource IDs.",
    ].join("\n"),
  },
});
