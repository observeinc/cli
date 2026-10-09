import { defineRoutes } from "../../lib/stricli-wrappers";
import { auditCommand } from "./audit";

export const instrumentationRoutes = defineRoutes({
  routes: {
    audit: auditCommand,
  },
  docs: {
    brief: "Assess and instrument applications",
    fullDescription:
      "Detect application stacks and assess OpenTelemetry instrumentation compatibility.",
  },
});
