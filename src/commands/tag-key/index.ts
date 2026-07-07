import { defineRoutes } from "../../lib/stricli-wrappers";
import { listCommand } from "./list";

export const tagKeyRoutes = defineRoutes({
  routes: {
    list: listCommand,
  },
  docs: {
    brief: "Search and view tag keys",
    fullDescription: "Search and view tag keys",
  },
});
