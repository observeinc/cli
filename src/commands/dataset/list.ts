import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { listDatasets } from "../../rest/dataset/list-datasets";
import { searchDatasetsViaKG } from "../../kg/search-datasets-kg";
import type { DatasetResource } from "../../rest/generated";
import { celFuzzyContains } from "../../lib/cel";
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
  label?: string;
  filter?: string;
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
 * Validates correlation-tag flag combinations and KG-incompatible sibling
 * flags. The two correlation-tag flags must be supplied together (a value
 * without a key has no meaning, and a key without a value cannot resolve a
 * tag-value document in the KG).
 *
 * Flags incompatible with the KG correlation-tag path:
 * - `--filter`: the semantic search service has no CEL-equivalent filter
 *   (only an exact `metadata_key`/`metadata_value` pair).
 * - `--sort`: `ListDocumentsRequest` has no `order_by` parameter, and
 *   sorting KG-projected rows on fields we cannot populate (`updatedAt`,
 *   `kind`) would produce meaningless results.
 *
 * `--label`, `--limit` and `--offset` stay allowed; `searchDatasetsViaKG`
 * applies them internally so the call site stays symmetric with the
 * native `listDatasets` helper.
 */
export function validateDatasetFlags(flags: ListDatasetsFlags): void {
  if (flags.correlationTagValue != null && flags.correlationTagKey == null) {
    throw new Error("--correlation-tag-value requires --correlation-tag-key");
  }
  if (flags.correlationTagKey != null && flags.correlationTagValue == null) {
    throw new Error("--correlation-tag-key requires --correlation-tag-value");
  }
  if (flags.correlationTagKey == null) return;
  const offenders: string[] = [];
  if (flags.filter != null) offenders.push("--filter");
  if (flags.sort != null) offenders.push("--sort");
  if (offenders.length > 0) {
    throw new Error(
      `${offenders.join(", ")} cannot be combined with --correlation-tag-key/--correlation-tag-value`,
    );
  }
}

// Backends are injected via the optional `deps` parameter so tests can swap
// in stubs without using `mock.module`, which is process-global in bun and
// leaks across test files.
export interface ListDatasetsDeps {
  loadConfig?: typeof loadConfig;
  searchDatasetsViaKG?: typeof searchDatasetsViaKG;
  listDatasets?: typeof listDatasets;
}

export async function list(
  this: LocalContext,
  flags: ListDatasetsFlags,
  deps: ListDatasetsDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    searchDatasetsViaKG: searchKG = searchDatasetsViaKG,
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
    // Aliased as consts so TS narrows inside the KG dispatch branch without
    // needing non-null assertions; validateDatasetFlags guarantees both are
    // present together.
    const correlationTagKey = flags.correlationTagKey;
    const correlationTagValue = flags.correlationTagValue;

    writer.info("Fetching datasets...");

    // Interim KG path: routes --correlation-tag-key/--correlation-tag-value
    // through the V2 Knowledge Graph while the native Dataset API lacks a
    // correlation-tag predicate. Delete this branch (and
    // `searchDatasetsViaKG`) once the native API supports it. The wrapper
    // mirrors `listDatasets`'s `DatasetsResponse` contract, so the command
    // stays a flat dispatch.
    let datasets: DatasetResource[];
    let totalCount: number;
    if (correlationTagKey != null && correlationTagValue != null) {
      const response = await searchKG({
        config,
        correlationTagKey,
        correlationTagValue,
        label: flags.label,
        limit: flags.limit,
        offset: flags.offset,
      });
      datasets = response.datasets;
      totalCount = response.meta.totalCount;
    } else {
      const filters: string[] = [];
      if (flags.label) {
        filters.push(celFuzzyContains("label", flags.label));
      }
      if (flags.filter) {
        filters.push(flags.filter);
      }
      const filter = filters.join(" && ");

      const response = await listD({
        config,
        filter,
        limit: flags.limit,
        offset: flags.offset,
        orderBy: flags.sort,
      });
      datasets = response.datasets;
      totalCount = response.meta.totalCount;
    }

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

    // `meta.totalCount = -1` signals "unknown / truncated" (KG path); only
    // surface a true population total when the helper knows it.
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
      label: {
        kind: "parsed",
        parse: String,
        brief: "Filter datasets by label (substring match)",
        optional: true,
      },
      filter: {
        kind: "parsed",
        parse: String,
        brief: "Filter datasets with a CEL expression",
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
      f: "filter",
      l: "limit",
      s: "sort",
    },
  },
  docs: {
    brief: "List datasets in Observe",
  },
});
