import { defineRoutes } from "../../lib/stricli-wrappers";
import { listCommand } from "./list";

export const tagValueRoutes = defineRoutes({
  routes: {
    list: listCommand,
  },
  docs: {
    brief: "Search and view tag values",
    fullDescription: [
      "Search and view tag values",
      "",
      "Commands:",
      "  list    Search for tag values",
    ].join("\n"),
  },
});
