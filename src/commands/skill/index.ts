import { defineRoutes } from "../../lib/stricli-wrappers";
import { listCommand } from "./list";
import { viewCommand } from "./view";
import { logUseCommand } from "./log-use";

export const skillRoutes = defineRoutes({
  routes: {
    list: listCommand,
    view: viewCommand,
    "log-use": logUseCommand,
  },
  docs: {
    brief: "View AI agent skills",
    // log-use is telemetry plumbing, not user-facing: keep it runnable but
    // hidden from `observe skill --help`.
    hideRoute: { "log-use": true },
    fullDescription: "View and manage AI agent skills in Observe",
  },
});
