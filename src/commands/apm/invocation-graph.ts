import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { getApmInvocationGraph } from "../../rest/apm/get-apm-invocation-graph";
import type { ApmServiceInvocation } from "../../rest/generated";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import {
  formatTable,
  createColumnHelper,
  type ColumnDef,
} from "../../lib/formatters/table";
import { renderAsCSV } from "../../lib/formatters/csv";
import {
  type OutputFormat,
  describeMode,
  describeNode,
  formatLatency,
  formatRate,
  formatWindow,
  resolveTimeWindow,
  timeWindowFlags,
} from "./apm-utils";

const AVAILABLE_FIELDS = [
  "source",
  "target",
  "targetType",
  "invRate",
  "errRate",
  "p95",
] as const;

type FieldName = (typeof AVAILABLE_FIELDS)[number];

const DEFAULT_FIELDS: FieldName[] = [...AVAILABLE_FIELDS];

interface GetApmInvocationGraphFlags {
  serviceName?: string;
  environment?: string;
  serviceNamespace?: string;
  endpointName?: string;
  directNeighborsOnly?: boolean;
  lookback?: number;
  startTime?: string;
  endTime?: string;
  fields?: FieldName[];
  format?: OutputFormat;
  json?: boolean;
}

export interface GetApmInvocationGraphDeps {
  loadConfig?: typeof loadConfig;
  getApmInvocationGraph?: typeof getApmInvocationGraph;
}

const col = createColumnHelper<ApmServiceInvocation>();

const FIELD_COLUMNS = {
  source: col.accessor((row) => describeNode(row.source), { header: "SOURCE" }),
  target: col.accessor((row) => describeNode(row.target), { header: "TARGET" }),
  targetType: col.accessor((row) => row.target.type ?? "-", {
    header: "TARGET TYPE",
  }),
  invRate: col.accessor((row) => row.metrics.invocationRatePerSecond, {
    header: "INV/S",
    format: formatRate,
  }),
  errRate: col.accessor((row) => row.metrics.errorRatePerSecond, {
    header: "ERR/S",
    format: formatRate,
  }),
  p95: col.accessor((row) => row.metrics.durationP95Seconds, {
    header: "P95(S)",
    format: formatLatency,
  }),
} satisfies Record<FieldName, ColumnDef<ApmServiceInvocation>>;

export async function invocationGraph(
  this: LocalContext,
  flags: GetApmInvocationGraphFlags,
  deps: GetApmInvocationGraphDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    getApmInvocationGraph: getApmInvocationGraphImpl = getApmInvocationGraph,
  } = deps;
  const { process, writer: _writer } = this;

  const format = flags.json ? ("json" as const) : flags.format;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  // Mode guards (mirror the server's cross-field rules in apm/handler.go).
  // Validated up front so we never reach the catch block for pure input errors.
  if (flags.endpointName && !flags.serviceName) {
    writer.error(
      "--endpoint-name requires --service-name (and --environment).",
    );
    process.exit(1);
    return;
  }
  if (flags.directNeighborsOnly && !flags.serviceName) {
    writer.error("--direct-neighbors-only requires --service-name.");
    process.exit(1);
    return;
  }
  if (flags.serviceName && !flags.environment) {
    writer.error("--environment is required when --service-name is set.");
    process.exit(1);
    return;
  }

  try {
    const config = loadConfigImpl();

    writer.info("Fetching APM invocation graph...");

    const { startTime, endTime } = resolveTimeWindow(flags);

    const response = await getApmInvocationGraphImpl({
      config,
      serviceName: flags.serviceName,
      environment: flags.environment,
      serviceNamespace: flags.serviceNamespace,
      endpointName: flags.endpointName,
      directNeighborsOnly: flags.directNeighborsOnly,
      startTime,
      endTime,
    });

    // Unlike the list commands, --json emits the full envelope: the graph has
    // two arrays (services + invocations) and no single primary array, and
    // consumers need both per-edge metrics and per-service redMetrics.
    if (format === "json") {
      writer.write(JSON.stringify(response, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(response.invocations));
      return;
    }

    const { services, invocations } = response;
    writer.write(
      chalk.green(
        `${services.length} service(s), ${invocations.length} edge(s) — mode: ${describeMode(flags)}`,
      ) +
        chalk.dim(` — ${formatWindow(response.interval)}`) +
        "\n",
    );

    if (invocations.length === 0) {
      writer.warn("No invocations found for this scope.");
      return;
    }

    const fieldNames = flags.fields ?? DEFAULT_FIELDS;
    const columns = fieldNames.map((field) => FIELD_COLUMNS[field]);
    writer.write(formatTable(invocations, columns));
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exit(1);
  }
}

function parseFields(value: string): FieldName[] {
  const fields = value.split(",").map((f) => f.trim()) as FieldName[];
  for (const field of fields) {
    if (!AVAILABLE_FIELDS.includes(field)) {
      throw new Error(
        `Invalid field: "${field}". Available fields: ${AVAILABLE_FIELDS.join(", ")}`,
      );
    }
  }
  return fields;
}

export const invocationGraphCommand = defineCommand({
  experimental: true,
  loader: async () => invocationGraph,
  parameters: {
    positional: { kind: "tuple", parameters: [] },
    flags: {
      serviceName: {
        kind: "parsed",
        parse: String,
        brief: "Center the graph on this service (requires --environment)",
        optional: true,
      },
      environment: {
        kind: "parsed",
        parse: String,
        brief: "deployment.environment.name (required with --service-name)",
        optional: true,
      },
      serviceNamespace: {
        kind: "parsed",
        parse: String,
        brief: "Scope by service.namespace",
        optional: true,
      },
      endpointName: {
        kind: "parsed",
        parse: String,
        brief:
          "Center on one endpoint of the service (requires --service-name)",
        optional: true,
      },
      directNeighborsOnly: {
        kind: "boolean",
        brief:
          "Return only the focal service and its direct neighbours (requires --service-name)",
        optional: true,
      },
      ...timeWindowFlags,
      fields: {
        kind: "parsed",
        parse: parseFields,
        brief: `Comma-separated list of fields: ${AVAILABLE_FIELDS.join(", ")}`,
        optional: true,
      },
      format: {
        kind: "enum",
        values: ["json", "csv"],
        brief: "Output format (json, csv)",
        optional: true,
      },
      json: {
        kind: "boolean",
        brief: "Output as JSON (shorthand for --format=json)",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Get the APM service-to-service invocation graph",
    fullDescription: [
      "Return the service dependency graph for a window: services and the calls",
      "between them, each edge carrying request/error/latency metrics. Three modes:",
      "",
      "  global         no --service-name: the full graph across all services",
      "  focal-service  --service-name + --environment (+ --direct-neighbors-only)",
      "  focal-endpoint --service-name + --environment + --endpoint-name",
      "",
      "The graph is returned in a single response (not paginated). The query window",
      "defaults to the last hour; use --lookback <hours> or --start-time/--end-time.",
    ].join("\n"),
  },
});
