import { defineRoutes } from "../../lib/stricli-wrappers";
import { configureCommand } from "./configure";
import { loginCommand } from "./login";
import { logoutCommand } from "./logout";
import { profileRoutes } from "./profile/index";
import { statusCommand } from "./status";

export const authRoutes = defineRoutes({
  routes: {
    configure: configureCommand,
    login: loginCommand,
    logout: logoutCommand,
    profile: profileRoutes,
    status: statusCommand,
  },
  docs: {
    brief: "Authenticate with Observe",
    fullDescription: "Manage authentication for the Observe CLI",
  },
});
