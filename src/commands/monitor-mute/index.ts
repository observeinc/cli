import { buildRouteMap } from "@stricli/core";
import { listCommand } from "./list";
import { viewCommand } from "./view";
import { createCommand } from "./create";
import { updateCommand } from "./update";
import { deleteCommand } from "./delete";

export const monitorMuteRoutes = buildRouteMap({
  routes: {
    list: listCommand,
    view: viewCommand,
    create: createCommand,
    update: updateCommand,
    delete: deleteCommand,
  },
  docs: {
    brief: "Manage monitor mute rules",
    fullDescription: [
      "View and manage monitor mute rules (snoozes) in Observe.",
      "",
      "A mute rule suppresses alert notifications during a defined window,",
      "targeting either all monitors (Global) or a specific set (Monitors).",
      "",
      "Commands:",
      "  list    Search and list monitor mute rules",
      "  view    View details of a specific mute rule",
      "  create  Create a mute rule",
      "  update  Update a mute rule",
      "  delete  Delete a mute rule",
    ].join("\n"),
  },
});
