import { buildRouteMap } from "@stricli/core";
import { createAwsConnectionCommand } from "./aws.js";

export const createConnectionRoutes = buildRouteMap({
  routes: {
    aws: createAwsConnectionCommand,
  },
  docs: {
    brief: "Create a data connection",
    fullDescription: [
      "Create a data connection of a specific module type.",
      "",
      "Modules:",
      "  aws    AWS data connection (module: observeinc/connection/aws)",
    ].join("\n"),
  },
});
