import { buildCommand } from "@stricli/core";
import type { LocalContext } from "../context";
import { getDataset } from "../rest/dataset/get-dataset";
import { loadConfig } from "../lib/config";
import { formatApiError } from "../lib/format-error";
import { muteStatusWriter } from "../lib/writer";
import {
  datasetQueryOutput,
  type GqlDatasetQueryField,
  type PaginatedResults,
} from "../gql/dataset/dataset-query-output";
import { DataType } from "../gql/generated/graphql";
import { formatTable, type ColumnDef } from "../lib/formatters/table";
import { valueToString } from "../lib/formatters/value";
import { renderAsCSV } from "../lib/formatters/csv";
import { cyan, green, muted, red, yellow } from "../lib/formatters/colors";
import {
  type StageInput,
  ResultKind,
  VariantEncodingMode,
  RollupMode,
} from "../gql/generated/graphql";
import { transposeColumnsToRows } from "../lib/transpose";

type OutputFormat = "table" | "json" | "csv";

interface QueryDatasetFlags {
  input: readonly string[];
  pipeline?: string;
  start?: string;
  end?: string;
  interval?: string;
  limit: number;
  format?: OutputFormat;
  json?: boolean;
}

const DEFAULT_INTERVAL = "1h";
const DEFAULT_LIMIT = 100;

// Backends are injected via the optional `deps` parameter so tests can swap
// in stubs without using `mock.module`, which is process-global in bun and
// leaks across test files.
export interface QueryDeps {
  loadConfig?: typeof loadConfig;
  getDataset?: typeof getDataset;
  datasetQueryOutput?: typeof datasetQueryOutput;
}

export async function query(
  this: LocalContext,
  flags: QueryDatasetFlags,
  deps: QueryDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    getDataset: getDatasetImpl = getDataset,
    datasetQueryOutput: datasetQueryOutputImpl = datasetQueryOutput,
  } = deps;
  const { input: rawDatasetIds, pipeline: opal } = flags;
  const format = flags.json ? ("json" as const) : flags.format;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  try {
    const config = loadConfigImpl();

    const datasetIds = [...new Set(rawDatasetIds)];
    if (datasetIds.length === 0) {
      writer.error("At least one --input dataset ID is required");
      process.exit(1);
      return;
    }

    writer.info("Fetching dataset schema...");

    const datasets = await Promise.all(
      datasetIds.map((id) => getDatasetImpl({ config, id })),
    );

    const stageInputs = datasets.map((dataset) => {
      return {
        inputName: dataset.id,
        datasetId: dataset.id,
      };
    });

    writer.info("Executing query...");

    const stage: StageInput = {
      stageId: "main",
      pipeline: opal ?? "",
      inputs: stageInputs,
      pagination: {
        initialRows: `${flags.limit}`,
      },
      presentation: {
        resultKinds: [ResultKind.ResultKindSchema, ResultKind.ResultKindData],
        rollup: {},
        rollupMode: RollupMode.Never,
        variantEncodingMode: VariantEncodingMode.String,
      },
      bestEffortBinding: true,
    };

    const taskResults = await datasetQueryOutputImpl({
      config,
      variables: {
        query: [stage],
        params: getTimeRange(flags),
      },
    });

    const taskResultErrors = taskResults.filter((r) => !!r.errors?.length);
    if (taskResultErrors.length > 0) {
      const message = taskResultErrors
        .map((e) => e.errors?.map((e) => e.message).join(", "))
        .join(", ");
      throw new Error(message);
    }

    const stageTaskResults = taskResults.filter(
      (r) => r.stageId === stage.stageId,
    );
    const stageDataResult = stageTaskResults.find(
      (r) =>
        r.resultKind === ResultKind.ResultKindData &&
        r.paginatedResults != null,
    );
    const stageSchemaResult = stageDataResult?.resultSchema
      ? stageDataResult
      : stageTaskResults.find(
          (r) => r.resultKind === ResultKind.ResultKindSchema,
        );

    if (!stageSchemaResult) {
      throw new Error("No schema returned");
    }

    const errors = stageSchemaResult.errors?.map((e) => e.text);
    if (errors && errors.length > 0) {
      const message = errors.join("; ");
      throw new Error(message);
    }

    if (!stageDataResult) {
      throw new Error("No results");
    }

    const fieldList = stageSchemaResult.resultSchema?.fieldList ?? [];
    const fieldMap = new Map<string, GqlDatasetQueryField>();
    for (const field of fieldList) {
      if (field.name) {
        fieldMap.set(field.name, field);
      }
    }

    const headers = fieldList
      .map((f) => f.name)
      .filter((n): n is string => typeof n === "string");

    const paginated = stageDataResult.paginatedResults as
      | PaginatedResults
      | undefined;
    const rowArrays = transposeColumnsToRows(paginated?.columns);
    const rows = rowArrays.map((row) =>
      Object.fromEntries(headers.map((h, i) => [h, row[i]])),
    );

    if (format === "csv") {
      writer.write(renderAsCSV(rows));
      return;
    }

    if (format === "json") {
      writer.write(JSON.stringify(rows, null, 2));
      return;
    }

    if (rows.length === 0) {
      writer.info("No results");
      return;
    }

    const columns: ColumnDef<Record<string, unknown>>[] = headers.map((h) => {
      const field = fieldMap.get(h);

      return {
        header: h,
        accessorFn: (row) => row[h],
        format: getFieldFormatter(field),
        maxLines: 3,
      };
    });

    writer.write("\n" + formatTable(rows, columns));
    writer.info(`\n${rows.length} row(s)`);
  } catch (error) {
    const message = await formatApiError(error);
    writer.error(`Query failed: ${message}`);
    process.exit(1);
  }
}

/**
 * Resolve the query time window from CLI flags. Explicit start/end take
 * precedence; otherwise the interval (or DEFAULT_INTERVAL) is anchored at now.
 */
function getTimeRange(flags: {
  start?: string;
  end?: string;
  interval?: string;
}): { startTime: string; endTime: string } {
  if (flags.start && flags.end) {
    return { startTime: flags.start, endTime: flags.end };
  }
  if (flags.interval) {
    const startTime = new Date(
      Date.now() - intervalToMs(flags.interval),
    ).toISOString();
    const endTime = new Date().toISOString();
    return { startTime, endTime };
  }
  const startTime = new Date(
    Date.now() - intervalToMs(DEFAULT_INTERVAL),
  ).toISOString();
  return { startTime, endTime: new Date().toISOString() };
}

const INTERVAL_UNIT_MS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

function intervalToMs(value: string): number {
  const match = /^(\d+)(ms|s|m|h|d|w)$/i.exec(value.trim());
  if (!match) {
    throw new Error(
      `Invalid interval: "${value}". Expected format like "1h", "5m", or "30s".`,
    );
  }
  const amount = parseInt(match[1] ?? "0", 10);
  const unit = (match[2] ?? "").toLowerCase();
  const factor = INTERVAL_UNIT_MS[unit];
  if (factor === undefined) {
    throw new Error(`Invalid interval unit: "${unit}"`);
  }
  return amount * factor;
}

/**
 * Get a formatter function based on field type. The format function receives
 * the raw value (already non-null; the table formatter handles nulls) and
 * returns a styled string.
 */
function getFieldFormatter(
  field?: GqlDatasetQueryField,
): ((value: unknown) => string) | undefined {
  if (!field) return undefined;

  switch (field.type.tag) {
    case DataType.Int64:
    case DataType.Float64:
      return (v) => cyan(valueToString(v));
    case DataType.Bool:
      return (v) => (isTruthyBool(v) ? green("true") : red("false"));
    case DataType.Timestamp:
      return (v) => muted(valueToString(v));
    case DataType.Object:
    case DataType.Variant:
    case DataType.Array:
      return (v) => yellow(valueToString(v));
    default:
      return undefined;
  }
}

/**
 * The server encodes scalar values as strings in PaginatedResults, so "false"
 * comes through as a truthy string. Treat the string "true" (or a real boolean)
 * as true; everything else is false.
 */
function isTruthyBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
}

function parseLimit(value: string): number {
  const num = parseInt(value, 10);
  if (isNaN(num) || num < 1) {
    throw new Error(`Invalid limit: "${value}". Must be a positive number`);
  }
  return num;
}

export const queryCommand = buildCommand({
  loader: async () => query,
  parameters: {
    flags: {
      input: {
        kind: "parsed",
        parse: String,
        brief:
          "Dataset ID to use as a query input (repeat for multiple; duplicate IDs ignored).",
        variadic: true,
      },
      pipeline: {
        kind: "parsed",
        parse: String,
        brief: "OPAL pipeline to execute",
        optional: true,
      },
      start: {
        kind: "parsed",
        parse: String,
        brief: "Start time (ISO 8601 format)",
        optional: true,
      },
      end: {
        kind: "parsed",
        parse: String,
        brief: "End time (ISO 8601 format)",
        optional: true,
      },
      interval: {
        kind: "parsed",
        parse: String,
        brief:
          "Time interval relative to now (e.g., 1h, 24h, 7d) if start and end are not specified",
        optional: true,
      },
      limit: {
        kind: "parsed",
        parse: parseLimit,
        brief: "Maximum number of rows to return",
        default: String(DEFAULT_LIMIT),
      },
      format: {
        kind: "enum",
        values: ["json", "csv"],
        brief: "Output format (json, csv) (default: table)",
        optional: true,
      },
      json: {
        kind: "boolean",
        brief: "Output as JSON (shorthand for --format=json)",
        optional: true,
      },
    },
    aliases: {
      i: "input",
      p: "pipeline",
      s: "start",
      e: "end",
      t: "interval",
      l: "limit",
    },
  },
  docs: {
    brief: "Execute an OPAL query",
    fullDescription: [
      "Execute an OPAL query against one or more dataset inputs (repeat --input).",
      "",
      "Examples:",
      "  observe query --input 1234567890 --pipeline 'timechart count:count(), group_by(user_id)'",
      "  observe query --input 1234567890 --input 1234567891 --pipeline 'leftjoin on(@1234567891.user_id = user_id), user_name:@1234567891.user_name | timechart count:count(), group_by(user_name)'",
    ].join("\n"),
  },
});
