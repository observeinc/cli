import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { listApmServices } from "../../rest/apm/list-apm-services";
import {
  type ApmService,
  ListApmServicesOrderByParameter,
} from "../../rest/generated";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import { parseNonNegativeInt } from "../../lib/parsers";
import {
  formatTable,
  createColumnHelper,
  type ColumnDef,
} from "../../lib/formatters/table";
import { renderAsCSV } from "../../lib/formatters/csv";
import { resolveWindow, timeWindowFlags } from "../../lib/time-window";
import {
  type OutputFormat,
  formatLatency,
  formatRate,
  formatWindow,
  paginationHint,
  parseApmLimit,
} from "./apm-utils";

// Field selectors match the API/JSON field names (consistent with --sort).
const AVAILABLE_FIELDS = [
  "serviceName",
  "environment",
  "serviceNamespace",
  "type",
  "language",
  "invocationRatePerSecond",
  "errorRatePerSecond",
  "durationP95Seconds",
] as const;

type FieldName = (typeof AVAILABLE_FIELDS)[number];

const DEFAULT_FIELDS: FieldName[] = [
  "serviceName",
  "environment",
  "serviceNamespace",
  "invocationRatePerSecond",
  "errorRatePerSecond",
  "durationP95Seconds",
];

interface ListApmServicesFlags {
  serviceName?: string;
  environment?: string;
  serviceNamespace?: string;
  start?: string;
  end?: string;
  interval?: string;
  expand?: boolean;
  limit?: number;
  offset?: number;
  sort?: ListApmServicesOrderByParameter;
  fields?: FieldName[];
  format?: OutputFormat;
  json?: boolean;
}

export interface ListApmServicesDeps {
  loadConfig?: typeof loadConfig;
  listApmServices?: typeof listApmServices;
}

const col = createColumnHelper<ApmService>();

const FIELD_COLUMNS = {
  serviceName: col.accessor((row) => row.serviceName, { header: "SERVICE" }),
  environment: col.accessor((row) => row.environment, {
    header: "ENVIRONMENT",
  }),
  serviceNamespace: col.accessor((row) => row.serviceNamespace ?? "-", {
    header: "NAMESPACE",
  }),
  type: col.accessor((row) => row.type ?? "-", { header: "TYPE" }),
  language: col.accessor((row) => row.language ?? "-", { header: "LANGUAGE" }),
  invocationRatePerSecond: col.accessor(
    (row) => row.redMetrics.invocationRatePerSecond,
    {
      header: "INV/S",
      format: formatRate,
    },
  ),
  errorRatePerSecond: col.accessor((row) => row.redMetrics.errorRatePerSecond, {
    header: "ERR/S",
    format: formatRate,
  }),
  durationP95Seconds: col.accessor((row) => row.redMetrics.durationP95Seconds, {
    header: "P95(S)",
    format: formatLatency,
  }),
} satisfies Record<FieldName, ColumnDef<ApmService>>;

export async function services(
  this: LocalContext,
  flags: ListApmServicesFlags,
  deps: ListApmServicesDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    listApmServices: listApmServicesImpl = listApmServices,
  } = deps;
  const { process, writer: _writer } = this;

  const format = flags.json ? ("json" as const) : flags.format;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  try {
    const config = loadConfigImpl();

    writer.info("Listing APM services...");

    const { startTime, endTime } = resolveWindow(flags);

    const response = await listApmServicesImpl({
      config,
      serviceName: flags.serviceName,
      environment: flags.environment,
      serviceNamespace: flags.serviceNamespace,
      startTime,
      endTime,
      expand: flags.expand,
      limit: flags.limit,
      offset: flags.offset,
      orderBy: flags.sort,
    });

    const rows = response.services;

    if (format === "json") {
      writer.write(JSON.stringify(response, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(rows));
      return;
    }

    if (rows.length === 0) {
      writer.warn("No APM services found.");
      return;
    }

    writer.write(
      chalk.green(`Found ${rows.length} service(s)`) +
        chalk.dim(` — ${formatWindow(response.interval)}`) +
        "\n",
    );

    const fieldNames = flags.fields ?? DEFAULT_FIELDS;
    const columns = fieldNames.map((field) => FIELD_COLUMNS[field]);
    writer.write(formatTable(rows, columns));

    const hint = paginationHint(response.meta, rows.length);
    if (hint) writer.info(`\n${hint}`);
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exitCode = 1;
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

const SORT_VALUES = Object.values(ListApmServicesOrderByParameter);

export const servicesCommand = defineCommand({
  experimental: true,
  loader: async () => services,
  parameters: {
    positional: { kind: "tuple", parameters: [] },
    flags: {
      serviceName: {
        kind: "parsed",
        parse: String,
        brief: "Filter to an exact service.name",
        optional: true,
      },
      environment: {
        kind: "parsed",
        parse: String,
        brief: "Filter to an exact deployment.environment.name",
        optional: true,
      },
      serviceNamespace: {
        kind: "parsed",
        parse: String,
        brief: "Filter to an exact service.namespace",
        optional: true,
      },
      ...timeWindowFlags,
      expand: {
        kind: "boolean",
        brief:
          "Include a per-bucket redMetrics.series[] in each row (caps limit at 100)",
        optional: true,
      },
      limit: {
        kind: "parsed",
        parse: parseApmLimit,
        brief: "Maximum number of services to return (1-100000)",
        optional: true,
      },
      offset: {
        kind: "parsed",
        parse: parseNonNegativeInt,
        brief: "Offset for pagination (skip this many results)",
        optional: true,
      },
      sort: {
        kind: "enum",
        values: SORT_VALUES,
        brief:
          "Sort field; prefix with - for descending, e.g. --sort=-durationP95Seconds",
        optional: true,
      },
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
    aliases: {
      s: "sort",
      l: "limit",
    },
  },
  docs: {
    brief: "List APM services with RED metrics",
    fullDescription: [
      "List services (one row per service) with a RED-metrics snapshot: request",
      "rate, error rate, and p95 latency. Filters are exact-match on --service-name,",
      "--environment, and --service-namespace; an omitted filter matches all.",
      "",
      "The query window defaults to the last hour (filled server-side). Use",
      "--interval <duration> (e.g. 4h, 7d) for a relative window, or --start/--end",
      "(ISO 8601) for an absolute one.",
    ].join("\n"),
  },
});
