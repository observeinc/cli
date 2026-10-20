import { defineRoutes } from "../../../lib/stricli-wrappers";
import { createCommand } from "./create";

export const shareInTokenRoutes = defineRoutes({
  routes: {
    create: createCommand,
  },
  docs: {
    brief: "Manage share registration tokens",
  },
});
