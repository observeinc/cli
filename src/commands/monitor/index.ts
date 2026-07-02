import { monitorMuteRoutes } from "./mute/index";
import { defineRoutes } from "../../lib/stricli-wrappers";
import { listCommand } from "./list";
import { viewCommand } from "./view";
import { createCommand } from "./create";
import { updateCommand } from "./update";
import { deleteCommand } from "./delete";
import { enableCommand } from "./enable";
import { disableCommand } from "./disable";

export const monitorRoutes = defineRoutes({
  routes: {
    list: listCommand,
    view: viewCommand,
    create: createCommand,
    update: updateCommand,
    delete: deleteCommand,
    enable: enableCommand,
    disable: disableCommand,
    mute: monitorMuteRoutes,
  },
  docs: {
    brief: "Manage observe monitors",
    fullDescription: [
      "View and manage monitors in Observe",
      "",
      "Commands:",
      "  list     Search and list monitors in Observe",
      "  view     View details of a specific monitor",
      "  create   Create a new monitor",
      "  update   Update a monitor",
      "  delete   Delete a monitor",
      "  enable   Enable a monitor",
      "  disable  Disable a monitor",
      "  mute   Manage monitor mute rules (snoozes)",
    ].join("\n"),
  },
});
