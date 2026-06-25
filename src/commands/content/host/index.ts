import { defineRoutes } from "../../../lib/stricli-wrappers";
import { installCommand } from "./install";
import { viewCommand } from "./view";

export const hostContentRoutes = defineRoutes({
  routes: {
    install: installCommand,
    view: viewCommand,
  },
  docs: {
    brief: "Manage Host Explorer content",
  },
});
