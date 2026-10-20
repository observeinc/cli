import { defineRoutes } from "../../lib/stricli-wrappers";
import { setupCommand } from "./setup";
import { shareInTokenRoutes } from "./token";
import { registerCommand } from "./register";
import { listCommand } from "./list";
import { viewCommand } from "./view";
import { updateCommand } from "./update";
import { deleteCommand } from "./delete";
import { shareInTableRoutes } from "./table";

export const shareInRoutes = defineRoutes({
  routes: {
    setup: setupCommand,
    token: shareInTokenRoutes,
    register: registerCommand,
    list: listCommand,
    view: viewCommand,
    update: updateCommand,
    delete: deleteCommand,
    table: shareInTableRoutes,
  },
  docs: {
    brief: "Bring Snowflake data shares into Observe",
    fullDescription:
      "Register Snowflake shares with Observe and track their tables as datasets.",
  },
});
