import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { listSourceDatasets } from "../../rest/source-dataset/list-source-datasets";
import type { SourceDatasetResource } from "../../rest/generated";
import { celFuzzyContains, combineFilters } from "../../lib/cel";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import {
  makeFieldListParser,
  makeSortFieldParser,
  parseNonNegativeInt,
} from "../../lib/parsers";
import {
  formatTable,
  createColumnHelper,
  type ColumnDef,
} from "../../lib/formatters/table";
import { renderAsCSV } from "../../lib/formatters/csv";

type OutputFormat = "json" | "csv";

interface ListSourceDatasetsFlags {
  match?: string;
  filter?: string;
  sort?: string;
  limit: number;
  offset?: number;
  expand?: boolean;
  format?: OutputFormat;
  json?: boolean;
  fields?: FieldName[];
}

const SORT_FIELDS = ["label", "id", "createdAt", "updatedAt"] as const;

const AVAILABLE_FIELDS = [
  "id",
  "label",
  "type",
  "storage",
  "status",
  "description",
  "createdAt",
  "updatedAt",
  "observationsLastHour",
  "bytesLastHour",
  "lastIngest",
] as const;

type FieldName = (typeof AVAILABLE_FIELDS)[number];

const DEFAULT_FIELDS: FieldName[] = [
  "id",
  "label",
  "type",
  "status",
  "description",
];

const INGEST_STATS_FIELDS: ReadonlySet<FieldName> = new Set([
  "observationsLastHour",
  "bytesLastHour",
  "lastIngest",
]);

const col = createColumnHelper<SourceDatasetResource>();

const FIELD_COLUMNS = {
  id: col.accessor((row) => row.id, {
    header: "ID",
    format: (value) => chalk.cyan(value),
  }),
  label: col.accessor((row) => row.label, { header: "NAME" }),
  type: col.accessor((row) => row.dataSource.ingest?.schemaType ?? "", {
    header: "TYPE",
    format: (value) => chalk.dim(value),
  }),
  storage: col.accessor((row) => row.dataSource.ingest?.storage ?? "", {
    header: "STORAGE",
  }),
  status: col.accessor((row) => row.ingestStatus, { header: "STATUS" }),
  description: col.accessor((row) => row.description ?? "", {
    header: "DESCRIPTION",
    flex: true,
  }),
  createdAt: col.accessor((row) => row.createdAt, { header: "CREATED" }),
  updatedAt: col.accessor((row) => row.updatedAt, { header: "UPDATED" }),
  observationsLastHour: col.accessor(
    (row) => String(row.ingestStats?.observationsLastHour ?? "-"),
    { header: "OBSERVATIONS (1H)" },
  ),
  bytesLastHour: col.accessor(
    (row) => String(row.ingestStats?.bytesLastHour ?? "-"),
    { header: "BYTES (1H)" },
  ),
  lastIngest: col.accessor((row) => row.ingestStats?.lastIngest ?? "-", {
    header: "LAST INGEST",
  }),
} satisfies Record<FieldName, ColumnDef<SourceDatasetResource>>;

export interface ListSourceDatasetsDeps {
  loadConfig?: typeof loadConfig;
  listSourceDatasets?: typeof listSourceDatasets;
}

export async function list(
  this: LocalContext,
  flags: ListSourceDatasetsFlags,
  deps: ListSourceDatasetsDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    listSourceDatasets: listSD = listSourceDatasets,
  } = deps;
  const format = flags.json ? ("json" as const) : flags.format;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  try {
    const config = loadConfigImpl();

    writer.info("Fetching source datasets...");

    const filter = combineFilters([
      flags.match ? celFuzzyContains("label", flags.match) : undefined,
      flags.filter,
    ]);

    const fieldNames = flags.fields ?? DEFAULT_FIELDS;
    const wantsIngestStats = fieldNames.some((f) => INGEST_STATS_FIELDS.has(f));

    const response = await listSD({
      config,
      filter,
      orderBy: flags.sort,
      limit: flags.limit,
      offset: flags.offset,
      expand: flags.expand ?? (wantsIngestStats ? true : undefined),
    });
    const datasets = response.sourceDatasets;

    if (format === "json") {
      writer.write(JSON.stringify(datasets, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(datasets));
      return;
    }

    if (datasets.length === 0) {
      writer.warn("No source datasets found.");
      return;
    }

    const totalCount = response.meta.totalCount;
    const summary =
      totalCount >= 0
        ? `Found ${datasets.length} source dataset(s) (${totalCount} total):\n`
        : `Found ${datasets.length} source dataset(s):\n`;
    writer.write(chalk.green(summary));
    writer.write(
      formatTable(
        datasets,
        fieldNames.map((field) => FIELD_COLUMNS[field]),
      ),
    );

    const nextOffset = (flags.offset ?? 0) + datasets.length;
    const more =
      totalCount >= 0
        ? nextOffset < totalCount
        : datasets.length === flags.limit;
    if (more) {
      writer.info(
        `\nMore results may be available. Use --offset ${nextOffset} to see the next page.`,
      );
    }
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exitCode = 1;
  }
}

// The API caps a page at 100 without an error.
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;
const DEFAULT_LIMIT = 100;

function parseLimit(value: string): number {
  const num = Number(value);
  if (!Number.isInteger(num) || num < MIN_LIMIT || num > MAX_LIMIT) {
    throw new Error(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`);
  }
  return num;
}

export const listCommand = defineCommand({
  experimental: true,
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
        brief: "Filter by name substring (case-insensitive)",
        optional: true,
      },
      filter: {
        kind: "parsed",
        parse: String,
        brief: 'Filter with a CEL expression (e.g. label.matches("^Logs/"))',
        optional: true,
      },
      sort: {
        kind: "parsed",
        parse: makeSortFieldParser(SORT_FIELDS),
        brief: `Sort results by field: ${SORT_FIELDS.join(", ")} (default label; prefix with - for descending, e.g. --sort=-updatedAt)`,
        optional: true,
      },
      limit: {
        kind: "parsed",
        parse: parseLimit,
        brief: `Maximum number of source datasets to return (${MIN_LIMIT}-${MAX_LIMIT})`,
        default: String(DEFAULT_LIMIT),
      },
      offset: {
        kind: "parsed",
        parse: parseNonNegativeInt,
        brief: "Offset for pagination (skip this many results)",
        optional: true,
      },
      expand: {
        kind: "boolean",
        brief:
          "Include ingest stats for the last hour (set for you when --fields asks for one)",
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
        parse: makeFieldListParser(AVAILABLE_FIELDS),
        brief: `Comma-separated list of fields to display (${AVAILABLE_FIELDS.join(", ")})`,
        optional: true,
      },
    },
    aliases: {
      m: "match",
      f: "filter",
      l: "limit",
      s: "sort",
    },
  },
  docs: {
    brief: "List source datasets",
  },
});
