import { defineRoutes } from "../../lib/stricli-wrappers";
import { servicesCommand } from "./services";
import { environmentsCommand } from "./environments";
import { invocationGraphCommand } from "./invocation-graph";

export const apmRoutes = defineRoutes({
  routes: {
    services: servicesCommand,
    environments: environmentsCommand,
    "invocation-graph": invocationGraphCommand,
  },
  docs: {
    brief: "Explore APM services, environments, and dependencies",
    fullDescription: [
      "Read-only access to Application Performance Monitoring data.",
      "",
      "Commands:",
      "  services          List services with RED metrics (rate, errors, p95)",
      "  environments      List deployment environments and their service namespaces",
      "  invocation-graph  Get the service-to-service dependency graph",
    ].join("\n"),
  },
});
