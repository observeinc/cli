import { defineRoutes } from "../../../lib/stricli-wrappers";
import { listCommand } from "./list";
import { trackCommand } from "./track";
import { viewCommand } from "./view";
import { updateCommand } from "./update";
import { untrackCommand } from "./untrack";

export const inboundShareTableRoutes = defineRoutes({
  routes: {
    list: listCommand,
    track: trackCommand,
    view: viewCommand,
    update: updateCommand,
    untrack: untrackCommand,
  },
  docs: {
    brief: "Manage the tracked tables in a share",
  },
});
