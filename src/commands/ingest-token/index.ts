import { buildRouteMap } from "@stricli/core";
import { withExperimentalBadge } from "../../lib/experimental";
import { createCommand } from "./create";
import { viewCommand } from "./view";
import { listCommand } from "./list";
import { updateCommand } from "./update";

export const ingestTokenRoutes = buildRouteMap({
  routes: {
    create: createCommand,
    view: viewCommand,
    list: listCommand,
    update: updateCommand,
  },
  docs: {
    // EXPERIMENTAL
    brief: withExperimentalBadge("Manage ingest tokens"),
    fullDescription: "Create, read, update, and list ingest tokens in Observe.",
  },
});
