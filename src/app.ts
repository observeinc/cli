import { buildApplication } from "@stricli/core";
import { name } from "../package.json";
import { alertRoutes } from "./commands/alert/index.js";
import { apmRoutes } from "./commands/apm/index.js";
import { dataConnectionRoutes } from "./commands/data-connection/index.js";
import { datasourceRoutes } from "./commands/datasource/index.js";
import { datastreamTokenRoutes } from "./commands/datastream-token/index.js";
import { authRoutes } from "./commands/auth/index.js";
import { cliRoutes } from "./commands/cli/index.js";
import { contentRoutes } from "./commands/content/index.js";
import { datasetRoutes } from "./commands/dataset/index.js";
import { datastreamRoutes } from "./commands/datastream/index.js";
import { docsRoutes } from "./commands/docs/index.js";
import { helpCommand } from "./commands/help.js";
import { ingestTokenRoutes } from "./commands/ingest-token/index.js";
import { metricRoutes } from "./commands/metric/index.js";
import { monitorRoutes } from "./commands/monitor/index.js";
import { queryCommand } from "./commands/query.js";
import { skillRoutes } from "./commands/skill/index.js";
import { tagKeyRoutes } from "./commands/tag-key/index.js";
import { tagValueRoutes } from "./commands/tag-value/index.js";
import { CURRENT_CLI_VERSION } from "./lib/constants.js";
import { defineRoutes } from "./lib/stricli-wrappers.js";

/** Top-level route map containing all CLI commands */
export const routes = defineRoutes({
  routes: {
    help: helpCommand,
    auth: authRoutes,
    "tag-value": tagValueRoutes,
    "tag-key": tagKeyRoutes,
    dataset: datasetRoutes,
    metric: metricRoutes,
    query: queryCommand,
    skill: skillRoutes,
    alert: alertRoutes,
    monitor: monitorRoutes,
    apm: apmRoutes,
    content: contentRoutes,
    "ingest-token": ingestTokenRoutes,
    datasource: datasourceRoutes,
    "data-connection": dataConnectionRoutes,
    datastream: datastreamRoutes,
    "datastream-token": datastreamTokenRoutes,
    docs: docsRoutes,
    cli: cliRoutes,
  },
  defaultCommand: "help",
  docs: {
    brief: "Observe CLI",
    fullDescription:
      "observe is a command-line interface for interacting with Observe Inc. " +
      "It provides commands for configuration, querying datasets, and more.",
  },
});

export const app = buildApplication(routes, {
  name,
  versionInfo: {
    currentVersion: CURRENT_CLI_VERSION,
  },
  scanner: {
    caseStyle: "allow-kebab-for-camel",
  },
});
