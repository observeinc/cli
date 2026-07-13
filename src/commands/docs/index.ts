import { defineRoutes } from "../../lib/stricli-wrappers";
import { searchCommand } from "./search";

export const docsRoutes = defineRoutes({
  routes: {
    search: searchCommand,
  },
  docs: {
    brief: "Search Observe documentation",
    fullDescription: "Search across Observe's built-in documentation",
  },
});
