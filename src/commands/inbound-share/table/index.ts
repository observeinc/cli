import { defineRoutes } from "../../../lib/stricli-wrappers";
import { listCommand } from "./list";
import { schemaCommand } from "./schema";
import { trackCommand } from "./track";
import { viewCommand } from "./view";
import { updateCommand } from "./update";
import { attachCommand } from "./attach";
import { detachCommand } from "./detach";
import { untrackCommand } from "./untrack";

export const inboundShareTableRoutes = defineRoutes({
  routes: {
    list: listCommand,
    schema: schemaCommand,
    track: trackCommand,
    view: viewCommand,
    update: updateCommand,
    attach: attachCommand,
    detach: detachCommand,
    untrack: untrackCommand,
  },
  docs: {
    brief: "Manage the tracked tables in a share",
  },
});
