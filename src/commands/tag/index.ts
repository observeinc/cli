import { defineRoutes } from "../../lib/stricli-wrappers";
import { listCommand } from "./list";

export const tagRoutes = defineRoutes({
  routes: {
    list: listCommand,
  },
  docs: {
    brief: "Search and view tags",
    fullDescription: "Search and view tags",
  },
});
