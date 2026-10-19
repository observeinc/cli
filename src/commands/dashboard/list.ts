import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { listDashboards } from "../../rest/dashboard/list-dashboards";
import {
  type DashboardResource,
  DashboardResourceVisibility,
} from "../../rest/generated";
import { celMatchesInsensitive, combineFilters } from "../../lib/cel";
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

/** Flag-friendly spelling of the generated enum, so the two cannot drift. */
type Visibility = `${DashboardResourceVisibility}`;

const VISIBILITY_VALUES = Object.values(DashboardResourceVisibility);

type SortField =
  | "id"
  | "name"
  | "description"
  | "visibility"
  | "createdAt"
  | "updatedAt";

interface ListDashboardsFlags {
  match?: string;
  filter?: string;
  visibility?: Visibility;
  limit: number;
  offset?: number;
  sort?: SortField;
  format?: OutputFormat;
  json?: boolean;
  fields?: FieldName[];
}

const AVAILABLE_FIELDS = [
  "id",
  "name",
  "description",
  "visibility",
  "createdAt",
  "updatedAt",
] as const;

type FieldName = (typeof AVAILABLE_FIELDS)[number];

const DEFAULT_FIELDS: FieldName[] = ["id", "name", "visibility", "updatedAt"];

const col = createColumnHelper<DashboardResource>();

const FIELD_COLUMNS = {
  id: col.accessor((row) => row.id, {
    header: "ID",
    format: (value) => chalk.cyan(value),
  }),
  name: col.accessor((row) => row.name, {
    header: "NAME",
  }),
  description: col.accessor((row) => row.description ?? "-", {
    header: "DESCRIPTION",
    flex: true,
  }),
  visibility: col.accessor((row) => row.visibility, {
    header: "VISIBILITY",
    format: (value) =>
      value === DashboardResourceVisibility.Hidden
        ? chalk.yellow(value)
        : chalk.dim(value),
  }),
  createdAt: col.accessor((row) => row.createdAt, {
    header: "CREATED",
  }),
  updatedAt: col.accessor((row) => row.updatedAt, {
    header: "UPDATED",
  }),
} satisfies Record<FieldName, ColumnDef<DashboardResource>>;

export interface ListDashboardsDeps {
  loadConfig?: typeof loadConfig;
  listDashboards?: typeof listDashboards;
}

export async function list(
  this: LocalContext,
  flags: ListDashboardsFlags,
  deps: ListDashboardsDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    listDashboards: listDashboardsImpl = listDashboards,
  } = deps;
  const format = flags.json ? ("json" as const) : flags.format;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  try {
    const config = loadConfigImpl();

    writer.info("Fetching dashboards...");

    // The dashboard filter grammar documents `matches()` but not
    // `.lowerAscii()`, so `--match` uses the case-insensitive regex helper
    // rather than the fuzzy-contains builder used by `dataset list`.
    const filter = combineFilters([
      flags.match ? celMatchesInsensitive("name", flags.match) : undefined,
      flags.visibility ? `visibility == "${flags.visibility}"` : undefined,
      flags.filter,
    ]);

    const response = await listDashboardsImpl({
      config,
      filter,
      orderBy: flags.sort,
      limit: flags.limit,
      offset: flags.offset,
    });

    const dashboards = response.dashboards;
    const totalCount = response.meta.totalCount;
    const fieldNames = flags.fields ?? DEFAULT_FIELDS;

    // Items the API could not return. Always report them, including in
    // json/csv mode, so a short page isn't mistaken for a complete one.
    for (const item of response.errors) {
      writer.error(
        `Dashboard ${item.id} omitted (${item.type}): ${item.message}`,
      );
    }

    if (format === "json") {
      writer.write(JSON.stringify(dashboards, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(dashboards));
      return;
    }

    if (dashboards.length === 0) {
      writer.warn("No dashboards found.");
      return;
    }

    // `meta.totalCount` is -1 when the API cannot compute a population total.
    const summary =
      totalCount >= 0
        ? `Found ${dashboards.length} dashboard(s) (${totalCount} total):\n`
        : `Found ${dashboards.length} dashboard(s):\n`;
    writer.write(chalk.green(summary));

    const columns = fieldNames.map((field) => FIELD_COLUMNS[field]);
    writer.write(formatTable(dashboards, columns));

    // Omitted items still consume slots in the page, so count them here;
    // otherwise a page filled with some unreadable dashboards looks short and
    // the user is told there is nothing left to fetch.
    if (dashboards.length + response.errors.length === flags.limit) {
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

// The dashboards endpoint caps a page at 100 items.
const MAX_LIMIT = 100;
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
        brief: "Filter dashboards by name substring (case-insensitive)",
        optional: true,
      },
      filter: {
        kind: "parsed",
        parse: String,
        brief: "Filter dashboards with a CEL expression",
        optional: true,
      },
      visibility: {
        kind: "enum",
        values: VISIBILITY_VALUES,
        brief: "Filter dashboards by visibility",
        optional: true,
      },
      limit: {
        kind: "parsed",
        parse: parseLimit,
        brief: `Maximum number of dashboards to return (${MIN_LIMIT}-${MAX_LIMIT})`,
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
        values: [
          "id",
          "name",
          "description",
          "visibility",
          "createdAt",
          "updatedAt",
        ],
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
      l: "limit",
      s: "sort",
    },
  },
  docs: {
    brief: "List dashboards",
    fullDescription: [
      "List dashboards in Observe.",
      "",
      "List items carry envelope metadata only; `definition` is null.",
      "Use 'observe dashboard view <id>' for the full document.",
      "",
      "-m/--match matches a name substring, case-insensitively. -f/--filter",
      "takes a raw CEL expression for anything --match cannot express, and the",
      "two are AND-ed when both are given.",
      "",
      "Filterable with --filter: id, name, description, visibility, createdAt,",
      "updatedAt, createdBy.id, updatedBy.id, managedBy.id, objectTags,",
      "parameters.correlationTags, parameters.resources.ids/names,",
      "queries.inputs.ids/names, datasetFilter.id/name.",
      "",
      "Examples:",
      "  observe dashboard list -m kubernetes",
      "    # names containing 'kubernetes'",
      "  observe dashboard list -f 'name.matches(\"(?i)^prod\")'",
      "    # names starting with 'prod'",
      "  observe dashboard list -f 'createdBy.id == 2386'",
      "    # dashboards created by one user (id is an int in CEL)",
      '  observe dashboard list -f \'"Team" in objectTags && "Frontend" in objectTags["Team"]\'',
      "    # tagged Team=Frontend; guard the key, as a missing one errors",
      "  observe dashboard list -f '42908111 in queries.inputs.ids'",
      "    # dashboards querying a given dataset (ids are ints in CEL)",
      "  observe dashboard list -m checkout -f 'visibility == \"Hidden\"'",
      "    # both, AND-ed together",
    ].join("\n"),
  },
});
