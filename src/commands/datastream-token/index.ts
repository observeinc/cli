import { defineRoutes } from "../../lib/stricli-wrappers";
import { checkStatusCommand } from "./check-status.js";

export const datastreamTokenRoutes = defineRoutes({
  routes: {
    "check-status": checkStatusCommand,
  },
  docs: {
    brief: "Inspect datastream tokens",
    fullDescription:
      "Operations on datastream tokens — the per-datasource credentials used\n" +
      "for ingestion. Use 'check-status' to poll a token until data arrives.",
  },
});
