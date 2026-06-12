import { buildRouteMap } from "@stricli/core";
import { createDatasourceCommand } from "./create.js";
import { updateDatasourceCommand } from "./update.js";

export const datasourceRoutes = buildRouteMap({
  routes: {
    create: createDatasourceCommand,
    update: updateDatasourceCommand,
  },
  docs: {
    brief: "Manage datasources",
    fullDescription: [
      "Create and update datasources.",
      "",
      "Each datasource belongs to a parent data connection. Use",
      "'observe data-connection view <id>' to find datasource IDs.",
      "",
      "To generate a CloudFormation stack URL for an AWS connection, use",
      "'observe data-connection generate-stack-url <conn-id>'.",
    ].join("\n"),
  },
});
