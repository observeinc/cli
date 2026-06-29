import { defineRoutes } from "../../lib/stricli-wrappers";
import { configureCommand } from "./configure";
import { loginCommand } from "./login";
import { logoutCommand } from "./logout";
import { statusCommand } from "./status";

export const authRoutes = defineRoutes({
  routes: {
    configure: configureCommand,
    login: loginCommand,
    logout: logoutCommand,
    status: statusCommand,
  },
  docs: {
    brief: "Authenticate with Observe",
    fullDescription: [
      "Manage authentication for the Observe CLI",
      "",
      "Commands:",
      "  login      Authenticate with Observe using browser or device code flow",
      "  logout     Log out and revoke credentials",
      "  status     Show current authentication status",
      "  configure  Configure Observe CLI credentials",
    ].join("\n"),
  },
});
