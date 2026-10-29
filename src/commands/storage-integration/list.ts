import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { listStorageIntegrations } from "../../rest/storage-integration/list-storage-integrations";
import type { StorageIntegrationResource } from "../../rest/generated";
import { celMatchesInsensitive, combineFilters } from "../../lib/cel";
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

interface ListStorageIntegrationsFlags {
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

const SORT_FIELDS = ["id", "name", "createdAt", "updatedAt"] as const;

const AVAILABLE_FIELDS = [
  "id",
  "name",
  "type",
  "provider",
  "createdAt",
  "updatedAt",
] as const;

type FieldName = (typeof AVAILABLE_FIELDS)[number];

const DEFAULT_FIELDS: FieldName[] = ["id", "name", "type", "provider"];

const col = createColumnHelper<StorageIntegrationResource>();

const FIELD_COLUMNS = {
  id: col.accessor((row) => row.id, {
    header: "ID",
    format: (value) => chalk.cyan(value),
  }),
  name: col.accessor((row) => row.name, { header: "NAME" }),
  type: col.accessor((row) => row.type, {
    header: "TYPE",
    format: (value) => chalk.dim(value),
  }),
  provider: col.accessor((row) => row.storageProvider, { header: "PROVIDER" }),
  createdAt: col.accessor((row) => row.createdAt, { header: "CREATED" }),
  updatedAt: col.accessor((row) => row.updatedAt, { header: "UPDATED" }),
} satisfies Record<FieldName, ColumnDef<StorageIntegrationResource>>;

export interface ListStorageIntegrationsDeps {
  loadConfig?: typeof loadConfig;
  listStorageIntegrations?: typeof listStorageIntegrations;
}

export async function list(
  this: LocalContext,
  flags: ListStorageIntegrationsFlags,
  deps: ListStorageIntegrationsDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    listStorageIntegrations: listSI = listStorageIntegrations,
  } = deps;
  const format = flags.json ? ("json" as const) : flags.format;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  try {
    const config = loadConfigImpl();

    writer.info("Fetching storage integrations...");

    // name.matches is a documented filter; lowerAscii() is not, so use the
    // (?i) matches helper rather than celFuzzyContains.
    const filter = combineFilters([
      flags.match ? celMatchesInsensitive("name", flags.match) : undefined,
      flags.filter,
    ]);

    const response = await listSI({
      config,
      filter,
      orderBy: flags.sort,
      limit: flags.limit,
      offset: flags.offset,
      expand: flags.expand,
    });
    const integrations = response.storageIntegrations;

    if (format === "json") {
      writer.write(JSON.stringify(integrations, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(integrations));
      return;
    }

    if (integrations.length === 0) {
      writer.warn("No storage integrations found.");
      return;
    }

    const totalCount = response.meta.totalCount;
    const summary =
      totalCount >= 0
        ? `Found ${integrations.length} storage integration(s) (${totalCount} total):\n`
        : `Found ${integrations.length} storage integration(s):\n`;
    writer.write(chalk.green(summary));
    const fieldNames = flags.fields ?? DEFAULT_FIELDS;
    writer.write(
      formatTable(
        integrations,
        fieldNames.map((field) => FIELD_COLUMNS[field]),
      ),
    );

    const nextOffset = (flags.offset ?? 0) + integrations.length;
    const more =
      totalCount >= 0
        ? nextOffset < totalCount
        : integrations.length === flags.limit;
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
        brief: 'Filter with a CEL expression (e.g. type == "Iceberg")',
        optional: true,
      },
      sort: {
        kind: "parsed",
        parse: makeSortFieldParser(SORT_FIELDS),
        brief: `Sort results by field: ${SORT_FIELDS.join(", ")} (default id; prefix with - for descending, e.g. --sort=-createdAt)`,
        optional: true,
      },
      limit: {
        kind: "parsed",
        parse: parseLimit,
        brief: `Maximum number of storage integrations to return (${MIN_LIMIT}-${MAX_LIMIT})`,
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
        brief: "Include user details on createdBy and updatedBy",
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
    brief: "List storage integrations",
  },
});
