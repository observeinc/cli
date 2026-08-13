import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { listDatasets } from "../../rest/dataset/list-datasets";
import type { DatasetResource } from "../../rest/generated";
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

type SortField = "label" | "id" | "kind" | "updatedAt";

interface ListDatasetsFlags {
  match?: string;
  /** Deprecated alias for `match`, kept for backwards compatibility. */
  label?: string;
  filter?: string;
  query?: string;
  correlationTagKey?: string;
  correlationTagValue?: string;
  limit: number;
  offset?: number;
  sort?: SortField;
  format?: OutputFormat;
  json?: boolean;
  fields?: FieldName[];
}

const AVAILABLE_FIELDS = ["id", "label", "kind", "description"] as const;

type FieldName = (typeof AVAILABLE_FIELDS)[number];

const DEFAULT_FIELDS: FieldName[] = ["id", "label", "kind"];

const col = createColumnHelper<DatasetResource>();

const FIELD_COLUMNS: Record<FieldName, ColumnDef<DatasetResource>> = {
  id: col.accessor((row) => row.id, {
    header: "ID",
    format: (value) => chalk.cyan(value),
  }),
  label: col.accessor((row) => row.label, {
    header: "NAME",
  }),
  kind: col.accessor((row) => row.kind, {
    header: "KIND",
    format: (value) => chalk.dim(value),
  }),
  description: col.accessor((row) => row.description, {
    header: "DESCRIPTION",
    flex: true,
  }),
};

/**
 * Validates correlation-tag flag combinations: the two flags must be
 * supplied together (a value without a key has no meaning, and a key
 * without a value cannot build a `hasCorrelationTag()` predicate).
 */
export function validateDatasetFlags(flags: ListDatasetsFlags): void {
  if (flags.correlationTagValue != null && flags.correlationTagKey == null) {
    throw new Error("--correlation-tag-value requires --correlation-tag-key");
  }
  if (flags.correlationTagKey != null && flags.correlationTagValue == null) {
    throw new Error("--correlation-tag-key requires --correlation-tag-value");
  }
}

// Backends are injected via the optional `deps` parameter so tests can swap
// in stubs without using `mock.module`, which is process-global in bun and
// leaks across test files.
export interface ListDatasetsDeps {
  loadConfig?: typeof loadConfig;
  listDatasets?: typeof listDatasets;
}

export async function list(
  this: LocalContext,
  flags: ListDatasetsFlags,
  deps: ListDatasetsDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    listDatasets: listD = listDatasets,
  } = deps;
  const format = flags.json ? ("json" as const) : flags.format;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  try {
    validateDatasetFlags(flags);

    const config = loadConfigImpl();
    const correlationTagKey = flags.correlationTagKey;
    const correlationTagValue = flags.correlationTagValue;

    writer.info("Fetching datasets...");

    // `--label` is the pre-GA name for `--match`; `--match` wins when both
    // are supplied.
    const match = flags.match ?? flags.label;

    const filter =
      combineFilters([
        match ? celFuzzyContains("label", match) : undefined,
        correlationTagKey != null && correlationTagValue != null
          ? celHasCorrelationTag(correlationTagKey, correlationTagValue)
          : undefined,
        flags.filter,
      ]) ?? "";

    // `query` (semantic search) and `filter` map 1:1 to the /v1/datasets
    // params and are combinable — `filter` narrows the ranked results. Note
    // the API ignores `orderBy` when `query` is set and returns
    // `meta.totalCount = -1`, which the summary below already handles.
    const response = await listD({
      config,
      filter,
      query: flags.query,
      limit: flags.limit,
      offset: flags.offset,
      orderBy: flags.sort,
    });
    const datasets: DatasetResource[] = response.datasets;
    const totalCount = response.meta.totalCount;

    const fieldNames = flags.fields ?? DEFAULT_FIELDS;

    if (format === "json") {
      writer.write(JSON.stringify(datasets, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(datasets));
      return;
    }

    if (datasets.length === 0) {
      writer.warn("No datasets found.");
      return;
    }

    // `meta.totalCount = -1` signals "unknown" (set when `--query` is used);
    // only surface a true population total when the API reports one.
    const summary =
      totalCount >= 0
        ? `Found ${datasets.length} dataset(s) (${totalCount} total):\n`
        : `Found ${datasets.length} dataset(s):\n`;
    writer.write(chalk.green(summary));

    const columns = fieldNames.map((field) => FIELD_COLUMNS[field]);

    writer.write(formatTable(datasets, columns));

    if (datasets.length === flags.limit) {
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

const availableFieldsSet: ReadonlySet<string> = new Set(AVAILABLE_FIELDS);

function isFieldName(value: string): value is FieldName {
  return availableFieldsSet.has(value);
}

function parseFields(value: string) {
  return value.split(",").map((f) => {
    const field = f.trim();
    if (!isFieldName(field)) {
      throw new Error(
        `Invalid field: "${field}". Available fields: ${AVAILABLE_FIELDS.join(", ")}`,
      );
    }
    return field;
  });
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
        brief: "Filter datasets by name substring (case-insensitive)",
        optional: true,
      },
      label: {
        kind: "parsed",
        parse: String,
        brief: "Deprecated alias for --match",
        optional: true,
        hidden: true,
      },
      filter: {
        kind: "parsed",
        parse: String,
        brief: "Filter datasets with a CEL expression",
        optional: true,
      },
      query: {
        kind: "parsed",
        parse: String,
        brief:
          "Search datasets by relevance (semantic search; ignores --sort, combinable with --filter)",
        optional: true,
      },
      correlationTagKey: {
        kind: "parsed",
        parse: String,
        brief:
          "Filter datasets by correlation tag key (must be paired with --correlation-tag-value)",
        optional: true,
      },
      correlationTagValue: {
        kind: "parsed",
        parse: String,
        brief:
          "Filter datasets by correlation tag value (requires --correlation-tag-key)",
        optional: true,
      },
      limit: {
        kind: "parsed",
        parse: parseLimit,
        brief: `Maximum number of datasets to return (${MIN_LIMIT}-${MAX_LIMIT})`,
        default: String(DEFAULT_LIMIT),
      },
      offset: {
        kind: "parsed",
        parse: parseNonNegativeInt,
        brief: "Offset for pagination (skip this many results)",
        optional: true,
      },
      sort: {
        kind: "enum",
        values: ["label", "id", "kind", "updatedAt"],
        brief: "Sort results by field",
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
      f: "filter",
      q: "query",
      l: "limit",
      s: "sort",
    },
  },
  docs: {
    brief: "List datasets in Observe",
  },
});
