import { defineRoutes } from "../../lib/stricli-wrappers";
import { createCommand } from "./create";
import { viewCommand } from "./view";
import { listCommand } from "./list";
import { updateCommand } from "./update";

export const ingestTokenRoutes = defineRoutes({
  routes: {
    create: createCommand,
    view: viewCommand,
    list: listCommand,
    update: updateCommand,
  },
  docs: {
    brief: "Manage ingest tokens",
    fullDescription: [
      "Create, read, update, and list ingest tokens in Observe.",
      "",
      "Commands:",
      "  create   Create a new ingest token and associate with datastreams",
      "  view     View an ingest token by ID",
      "  list     List/search ingest tokens",
      "  update   Update an ingest token",
    ].join("\n"),
  },
});
