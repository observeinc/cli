import { defineRoutes } from "../../lib/stricli-wrappers";
import { listCommand } from "./list";
import { viewCommand } from "./view";
import { installCommand } from "./install";
import { updateCommand } from "./update";

export const skillRoutes = defineRoutes({
  routes: {
    list: listCommand,
    view: viewCommand,
    install: installCommand,
    update: updateCommand,
  },
  docs: {
    brief: "View AI agent skills",
    fullDescription: "View and manage AI agent skills in Observe",
  },
});
