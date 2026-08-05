import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { listMetrics, type MetricMatch } from "../../rest/metric/list-metrics";
import {
  celFuzzyContains,
  celHasCorrelationTag,
  combineFilters,
} from "../../lib/cel";
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

type OutputFormat = "json" | "csv";

interface ListMetricsFlags {
  match: string;
  correlationTagKey?: string;
  correlationTagValue?: string;
  limit: number;
  offset?: number;
  format?: OutputFormat;
  json?: boolean;
  fields?: FieldName[];
}

/**
 * The two correlation-tag flags must be supplied together: a value without
 * a key has no meaning, and a key without a value cannot build a
 * `hasCorrelationTag()` predicate.
 */
export function validateMetricFlags(flags: ListMetricsFlags): void {
  if (flags.correlationTagValue != null && flags.correlationTagKey == null) {
    throw new Error("--correlation-tag-value requires --correlation-tag-key");
  }
  if (flags.correlationTagKey != null && flags.correlationTagValue == null) {
    throw new Error("--correlation-tag-key requires --correlation-tag-value");
  }
}

const AVAILABLE_FIELDS = [
  "name",
  "datasetId",
  "nameWithPath",
  "description",
  "type",
  "unit",
  "aggregate",
  "rollup",
] as const;

type FieldName = (typeof AVAILABLE_FIELDS)[number];

const DEFAULT_FIELDS: FieldName[] = ["datasetId", "name", "type"];

const columns = createColumnHelper<MetricMatch>();

const FIELD_COLUMNS: Record<FieldName, ColumnDef<MetricMatch>> = {
  name: columns.accessor((row) => row.metric.name, {
    header: "NAME",
  }),
  datasetId: columns.accessor((row) => row.datasetId, {
    header: "DATASET ID",
    format: (value) => chalk.cyan(value),
  }),
  nameWithPath: columns.accessor((row) => row.metric.nameWithPath, {
    header: "PATH",
  }),
  description: columns.accessor((row) => row.metric.description, {
    header: "DESCRIPTION",
    flex: true,
  }),
  type: columns.accessor((row) => row.metric.type, {
    header: "TYPE",

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    format: (value) => (value ? chalk.blue(value) : chalk.dim("-")),
  }),
  unit: columns.accessor((row) => row.metric.unit || "-", {
    header: "UNIT",
  }),
  aggregate: columns.accessor((row) => row.metric.aggregate, {
    header: "AGGREGATE",
  }),
  rollup: columns.accessor((row) => row.metric.rollup, {
    header: "ROLLUP",
  }),
};

// Backends are injected via the optional `deps` parameter so tests can swap
// in stubs without using `mock.module`, which is process-global in bun and
// leaks across test files.
export interface ListMetricsDeps {
  loadConfig?: typeof loadConfig;
  listMetrics?: typeof listMetrics;
}

export async function list(
  this: LocalContext,
  flags: ListMetricsFlags,
  deps: ListMetricsDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    listMetrics: listRest = listMetrics,
  } = deps;
  const { process, writer: _writer } = this;

  const format = flags.json ? ("json" as const) : flags.format;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  try {
    validateMetricFlags(flags);

    const config = loadConfigImpl();

    writer.info("Searching metrics...");

    const correlationTagKey = flags.correlationTagKey;
    const correlationTagValue = flags.correlationTagValue;

    // Assemble the CEL filter here so the REST helper stays a thin wrapper:
    // a case-insensitive substring on `name` AND'd with an optional
    // `hasCorrelationTag()` predicate.
    const filter = combineFilters([
      flags.match !== "" ? celFuzzyContains("name", flags.match) : undefined,
      correlationTagKey != null && correlationTagValue != null
        ? celHasCorrelationTag(correlationTagKey, correlationTagValue)
        : undefined,
    ]);
    const response = await listRest({
      config,
      filter,
      limit: flags.limit,
      offset: flags.offset,
    });
    const metrics: MetricMatch[] = response.matches;
    const totalCount = Number(response.numSearched);

    const fieldNames = flags.fields ?? DEFAULT_FIELDS;

    if (format === "json") {
      writer.write(JSON.stringify(metrics, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(metrics));
      return;
    }

    if (metrics.length === 0) {
      writer.warn("No metrics found.");
      return;
    }

    // `numSearched: "-1"` signals "unknown" since the REST endpoint doesn't
    // report a searched-population count.
    const summary =
      totalCount >= 0
        ? `Found ${metrics.length} metric(s) (${totalCount} searched):\n`
        : `Found ${metrics.length} metric(s):\n`;
    writer.write(chalk.green(summary));

    const cols = fieldNames.map((field) => FIELD_COLUMNS[field]);
    writer.write(formatTable(metrics, cols));

    if (metrics.length === flags.limit) {
      const nextOffset = (flags.offset ?? 0) + flags.limit;
      writer.info(
        `\nMore results may be available. Use --offset ${nextOffset} to see the next page.`,
      );
    }
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exitCode = 1;
  }
}

const MAX_LIMIT = 1000;
const MIN_LIMIT = 1;
const DEFAULT_LIMIT = 100;

function parseLimit(value: string): number {
  const num = Number(value);
  if (isNaN(num) || num < MIN_LIMIT || num > MAX_LIMIT) {
    throw new Error(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`);
  }
  return num;
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

export const listCommand = defineCommand({
  loader: async () => list,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
    flags: {
      match: {
        kind: "parsed",
        parse: String,
        brief: "Search metrics by name",
        default: "",
      },
      correlationTagKey: {
        kind: "parsed",
        parse: String,
        brief:
          "Filter metrics by correlation tag key (must be paired with --correlation-tag-value)",
        optional: true,
      },
      correlationTagValue: {
        kind: "parsed",
        parse: String,
        brief:
          "Filter metrics by correlation tag value (requires --correlation-tag-key)",
        optional: true,
      },
      limit: {
        kind: "parsed",
        parse: parseLimit,
        brief: `Maximum number of metrics to return (${MIN_LIMIT}-${MAX_LIMIT})`,
        default: String(DEFAULT_LIMIT),
      },
      offset: {
        kind: "parsed",
        parse: parseNonNegativeInt,
        brief: "Offset for pagination (skip this many results)",
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
      fields: {
        kind: "parsed",
        parse: parseFields,
        brief: `Comma-separated list of fields to display (${AVAILABLE_FIELDS.join(", ")})`,
        optional: true,
      },
    },
    aliases: {
      m: "match",
      l: "limit",
    },
  },
  docs: {
    brief: "Search and list metrics in Observe",
  },
});
