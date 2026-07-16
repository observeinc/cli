import { defineRoutes } from "../../../lib/stricli-wrappers";
import { profileListCommand } from "./list";
import { profileUseCommand } from "./use";

export const profileRoutes = defineRoutes({
  routes: {
    list: profileListCommand,
    use: profileUseCommand,
  },
  docs: {
    brief: "Manage CLI profiles",
    fullDescription:
      "Manage named profiles for connecting to different Observe environments.",
  },
});
