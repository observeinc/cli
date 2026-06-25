import { buildRouteMap } from "@stricli/core";
import { withExperimentalBadge } from "../../../lib/experimental.js";
import { createAwsConnectionCommand } from "./aws.js";

export const createConnectionRoutes = buildRouteMap({
  routes: {
    aws: createAwsConnectionCommand,
  },
  docs: {
    brief: withExperimentalBadge("Create a data connection"),
    fullDescription: "Create a data connection of a specific module type.",
  },
});
