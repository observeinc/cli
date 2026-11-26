import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { listDatasets } from "../../rest/dataset/list-datasets";
import type {
  DatasetListResponse,
  DatasetResource,
} from "../../rest/generated";
import {
  celFuzzyContains,
  celHasCorrelationTag,
  combineFilters,
} from "../../lib/cel";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter, type Writer } from "../../lib/writer";
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

// The server returns at most this many datasets per request and silently
// reduces larger limits to it, so larger --limit values are fetched page by page.
const SERVER_PAGE_SIZE = 100;

// Semantic search (`query`) rejects offsets above this with a 400.
const MAX_SEMANTIC_OFFSET = 999;

/**
 * Reads `meta.hasMore` / `meta.nextOffset`. Servers that predate them return
 * neither, so `hasMore` comes back undefined and callers fall back to page
 * fullness.
 */
function readPagingMeta(meta: DatasetListResponse["meta"]) {
  const hasMore =
    "hasMore" in meta && typeof meta.hasMore === "boolean"
      ? meta.hasMore
      : undefined;
  const nextOffset =
    "nextOffset" in meta && typeof meta.nextOffset === "number"
      ? meta.nextOffset
      : null;
  return { hasMore, nextOffset };
}

/**
 * Offset of the page after this one, or undefined when no more datasets match.
 * Follows the server's `nextOffset` rather than assuming `pageOffset + pageLimit`;
 * page fullness is only a fallback for servers without `meta.hasMore`.
 */
function offsetAfterPage({
  meta,
  pageOffset,
  pageLimit,
  rowsReturned,
}: {
  meta: DatasetListResponse["meta"];
  pageOffset: number;
  pageLimit: number;
  rowsReturned: number;
}) {
  const { hasMore, nextOffset } = readPagingMeta(meta);
  if (hasMore === undefined) {
    return rowsReturned === pageLimit ? pageOffset + pageLimit : undefined;
  }
  return hasMore && nextOffset != null ? nextOffset : undefined;
}

function writeDatasets({
  writer,
  format,
  datasets,
  totalCount,
  fieldNames,
  nextPageOffset,
}: {
  writer: Writer;
  format: OutputFormat | undefined;
  datasets: DatasetResource[];
  totalCount: number;
  fieldNames: FieldName[];
  nextPageOffset: number | undefined;
}) {
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

  if (nextPageOffset !== undefined) {
    writer.info(
      `\nMore results may be available. Use --offset ${nextPageOffset} to see the next page.`,
    );
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
    const datasets: DatasetResource[] = [];
    let totalCount = -1;
    let pageOffset = flags.offset ?? 0;
    let nextPageOffset: number | undefined;
    let failedPage: { offset: number; error: unknown } | undefined;
    for (let pageIndex = 0; datasets.length < flags.limit; pageIndex++) {
      const pageLimit = Math.min(
        flags.limit - datasets.length,
        SERVER_PAGE_SIZE,
      );
      let response: DatasetListResponse;
      try {
        response = await listD({
          config,
          filter,
          query: flags.query,
          limit: pageLimit,
          offset: pageOffset,
          orderBy: flags.sort,
        });
      } catch (error) {
        if (pageIndex === 0) throw error;
        failedPage = { offset: pageOffset, error };
        nextPageOffset = undefined;
        break;
      }
      if (pageIndex === 0) totalCount = response.meta.totalCount;
      datasets.push(...response.datasets);

      nextPageOffset = offsetAfterPage({
        meta: response.meta,
        pageOffset,
        pageLimit,
        rowsReturned: response.datasets.length,
      });
      if (nextPageOffset === undefined || response.datasets.length === 0) break;
      if (flags.query != null && nextPageOffset > MAX_SEMANTIC_OFFSET) {
        // No --offset hint: semantic search returns 400 past this offset.
        nextPageOffset = undefined;
        break;
      }
      pageOffset = nextPageOffset;
    }

    writeDatasets({
      writer,
      format,
      datasets,
      totalCount,
      fieldNames: flags.fields ?? DEFAULT_FIELDS,
      nextPageOffset,
    });

    if (failedPage) {
      const remaining = flags.limit - datasets.length;
      writer.error(
        `Stopped after ${datasets.length} dataset(s): the request at --offset ${failedPage.offset} failed: ${await formatApiError(failedPage.error)}\n` +
          `Re-run with --offset ${failedPage.offset} --limit ${remaining} to fetch the rest.`,
      );
      process.exitCode = 1;
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
        brief: `Maximum number of datasets to return (${MIN_LIMIT}-${MAX_LIMIT}, fetched ${SERVER_PAGE_SIZE} per request)`,
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
