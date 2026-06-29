import { defineRoutes } from "../../lib/stricli-wrappers";
import { installCommand } from "./install";
import { uninstallCommand } from "./uninstall";
import { upgradeCommand } from "./upgrade";

export const cliRoutes = defineRoutes({
  routes: {
    install: installCommand,
    uninstall: uninstallCommand,
    upgrade: upgradeCommand,
  },
  docs: {
    brief: "CLI management commands",
    fullDescription: [
      "Commands for managing the Observe CLI itself.",
      "",
      "Commands:",
      "  install      Install the Observe CLI",
      "  uninstall    Uninstall the Observe CLI",
      "  upgrade      Upgrade to the latest version of the Observe CLI",
    ].join("\n"),
  },
});
