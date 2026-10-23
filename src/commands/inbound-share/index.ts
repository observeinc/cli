import { defineRoutes } from "../../lib/stricli-wrappers";
import { setupCommand } from "./setup";
import { inboundShareTokenRoutes } from "./token";
import { registerCommand } from "./register";
import { listCommand } from "./list";
import { viewCommand } from "./view";
import { updateCommand } from "./update";
import { deleteCommand } from "./delete";
import { inboundShareTableRoutes } from "./table";

export const inboundShareRoutes = defineRoutes({
  routes: {
    setup: setupCommand,
    token: inboundShareTokenRoutes,
    register: registerCommand,
    list: listCommand,
    view: viewCommand,
    update: updateCommand,
    delete: deleteCommand,
    table: inboundShareTableRoutes,
  },
  docs: {
    brief: "Bring Snowflake data shares into Observe",
    fullDescription:
      "Register Snowflake shares with Observe and track their tables as datasets.",
  },
});
