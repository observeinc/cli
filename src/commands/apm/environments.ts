import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { listApmEnvironments } from "../../rest/apm/list-apm-environments";
import {
  type ApmEnvironmentEntry,
  ListApmEnvironmentsOrderByParameter,
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
  formatWindow,
  paginationHint,
  parseApmLimit,
} from "./apm-utils";

// Field selectors match the API/JSON field names.
const AVAILABLE_FIELDS = [
  "environment",
  "serviceNamespaces",
  "truncated",
] as const;

type FieldName = (typeof AVAILABLE_FIELDS)[number];

const DEFAULT_FIELDS: FieldName[] = ["environment", "serviceNamespaces"];

interface ListApmEnvironmentsFlags {
  environment?: string;
  start?: string;
  end?: string;
  interval?: string;
  limit?: number;
  offset?: number;
  sort?: ListApmEnvironmentsOrderByParameter;
  fields?: FieldName[];
  format?: OutputFormat;
  json?: boolean;
}

export interface ListApmEnvironmentsDeps {
  loadConfig?: typeof loadConfig;
  listApmEnvironments?: typeof listApmEnvironments;
}

const col = createColumnHelper<ApmEnvironmentEntry>();

const FIELD_COLUMNS = {
  environment: col.accessor((row) => row.environment, {
    header: "ENVIRONMENT",
  }),
  serviceNamespaces: col.accessor(
    (row) => {
      const joined = row.serviceNamespaces.join(", ") || "-";
      return row.truncated ? `${joined} (truncated)` : joined;
    },
    { header: "SERVICE NAMESPACES" },
  ),
  truncated: col.accessor((row) => (row.truncated ? "yes" : "no"), {
    header: "TRUNCATED",
  }),
} satisfies Record<FieldName, ColumnDef<ApmEnvironmentEntry>>;

export async function environments(
  this: LocalContext,
  flags: ListApmEnvironmentsFlags,
  deps: ListApmEnvironmentsDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    listApmEnvironments: listApmEnvironmentsImpl = listApmEnvironments,
  } = deps;
  const { process, writer: _writer } = this;

  const format = flags.json ? ("json" as const) : flags.format;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  try {
    const config = loadConfigImpl();

    writer.info("Listing APM environments...");

    const { startTime, endTime } = resolveWindow(flags);

    const response = await listApmEnvironmentsImpl({
      config,
      environment: flags.environment,
      startTime,
      endTime,
      limit: flags.limit,
      offset: flags.offset,
      orderBy: flags.sort,
    });

    const rows = response.environments;

    if (format === "json") {
      writer.write(JSON.stringify(response, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(rows));
      return;
    }

    if (rows.length === 0) {
      writer.warn("No APM environments found.");
      return;
    }

    writer.write(
      chalk.green(`Found ${rows.length} environment(s)`) +
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

const SORT_VALUES = Object.values(ListApmEnvironmentsOrderByParameter);

export const environmentsCommand = defineCommand({
  experimental: true,
  loader: async () => environments,
  parameters: {
    positional: { kind: "tuple", parameters: [] },
    flags: {
      environment: {
        kind: "parsed",
        parse: String,
        brief: "Filter to an exact deployment.environment.name",
        optional: true,
      },
      ...timeWindowFlags,
      limit: {
        kind: "parsed",
        parse: parseApmLimit,
        brief: "Maximum number of environments to return (1-100000)",
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
          "Sort field; prefix with - for descending, e.g. --sort=-environment",
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
    brief: "List APM deployment environments and their service namespaces",
    fullDescription: [
      "List deployment environments with active telemetry in the window, each with",
      "the set of service namespaces observed in it. Use this to discover valid",
      "--environment values for the other apm commands.",
      "",
      "The query window defaults to the last hour (filled server-side). Use",
      "--interval <duration> (e.g. 4h, 7d) for a relative window, or --start/--end",
      "(ISO 8601) for an absolute one.",
    ].join("\n"),
  },
});
