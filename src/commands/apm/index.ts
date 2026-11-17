import { defineRoutes } from "../../lib/stricli-wrappers";
import { servicesCommand } from "./services";
import { environmentsCommand } from "./environments";
import { invocationGraphCommand } from "./invocation-graph";

const serviceRoutes = defineRoutes({
  routes: {
    list: servicesCommand,
  },
  docs: {
    brief: "Explore APM services",
  },
});

const environmentRoutes = defineRoutes({
  routes: {
    list: environmentsCommand,
  },
  docs: {
    brief: "Explore APM environments",
  },
});

export const apmRoutes = defineRoutes({
  routes: {
    service: serviceRoutes,
    environment: environmentRoutes,
    "invocation-graph": invocationGraphCommand,
  },
  docs: {
    brief: "Explore APM services, environments, and dependencies",
    fullDescription: [
      "Read-only access to Application Performance Monitoring data.",
      "",
      "Commands:",
      "  service list          List services with RED metrics (rate, errors/s, p95)",
      "  environment list      List deployment environments and their service namespaces",
      "  invocation-graph      Get the service-to-service dependency graph",
    ].join("\n"),
  },
});
