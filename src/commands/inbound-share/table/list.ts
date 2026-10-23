import { defineCommand } from "../../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../../context";
import { listAllTrackedTables } from "../../../rest/inbound-share/list-all-tracked-tables";
import { listShareTables } from "../../../rest/inbound-share/list-share-tables";
import { listUntrackedShareTables } from "../../../rest/inbound-share/list-untracked-share-tables";
import type {
  TableResource,
  UntrackedTable,
} from "../../../rest/inbound-share/types";
import { celFuzzyContains, combineFilters } from "../../../lib/cel";
import { loadConfig } from "../../../lib/config";
import { formatApiError } from "../../../lib/format-error";
import { muteStatusWriter } from "../../../lib/writer";
import { parseNonNegativeInt } from "../../../lib/parsers";
import {
  formatTable,
  createColumnHelper,
  type ColumnDef,
} from "../../../lib/formatters/table";
import { renderAsCSV } from "../../../lib/formatters/csv";
import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MIN_LIMIT,
  isNotFound,
  parseLimit,
  type OutputFormat,
} from "../shared";

interface ListTablesFlags {
  shareId?: string;
  untracked?: boolean;
  match?: string;
  filter?: string;
  sort?: string;
  limit: number;
  offset?: number;
  expand?: boolean;
  format?: OutputFormat;
  json?: boolean;
}

const col = createColumnHelper<TableResource>();

const ID_COLUMN = col.accessor((row) => row.id, {
  header: "ID",
  format: (value) => chalk.cyan(value),
});

const DETAIL_COLUMNS: ColumnDef<TableResource>[] = [
  col.accessor((row) => `${row.schemaName}.${row.tableName}`, {
    header: "TABLE",
  }),
  col.accessor((row) => row.tableType, {
    header: "TYPE",
    format: (value) => chalk.dim(value),
  }),
  col.accessor((row) => row.health, { header: "HEALTH" }),
  col.accessor((row) => row.cdcStatus, { header: "CDC" }),
  col.accessor((row) => row.sourceDataset?.id ?? "", { header: "DATASET" }),
];

const COLUMNS: ColumnDef<TableResource>[] = [ID_COLUMN, ...DETAIL_COLUMNS];

const ALL_SHARES_COLUMNS: ColumnDef<TableResource>[] = [
  ID_COLUMN,
  col.accessor((row) => row.share.id, { header: "SHARE" }),
  ...DETAIL_COLUMNS,
];

const untrackedCol = createColumnHelper<UntrackedTable>();

const UNTRACKED_COLUMNS: ColumnDef<UntrackedTable>[] = [
  untrackedCol.accessor((row) => `${row.schemaName}.${row.tableName}`, {
    header: "TABLE",
  }),
  untrackedCol.accessor((row) => row.tableType, {
    header: "TYPE",
    format: (value) => chalk.dim(value),
  }),
];

export interface ListTablesDeps {
  loadConfig?: typeof loadConfig;
  listShareTables?: typeof listShareTables;
  listAllTrackedTables?: typeof listAllTrackedTables;
  listUntrackedShareTables?: typeof listUntrackedShareTables;
}

export async function list(
  this: LocalContext,
  flags: ListTablesFlags,
  deps: ListTablesDeps = {},
): Promise<void> {
  const { shareId } = flags;
  const {
    loadConfig: loadConfigImpl = loadConfig,
    listShareTables: listImpl = listShareTables,
    listAllTrackedTables: listAllImpl = listAllTrackedTables,
    listUntrackedShareTables: listUntrackedImpl = listUntrackedShareTables,
  } = deps;
  const format = flags.json ? ("json" as const) : flags.format;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  if (flags.untracked && shareId === undefined) {
    writer.error("--untracked needs --share-id.");
    process.exitCode = 1;
    return;
  }

  try {
    const config = loadConfigImpl();

    const filter = combineFilters([
      flags.match ? celFuzzyContains("tableName", flags.match) : undefined,
      flags.filter,
    ]);

    if (flags.untracked && shareId !== undefined) {
      writer.info("Fetching untracked tables...");
      const response = await listUntrackedImpl({
        config,
        shareId,
        filter,
        orderBy: flags.sort,
        limit: flags.limit,
        offset: flags.offset,
      });
      const tables = response.tables;
      if (format === "json") {
        writer.write(JSON.stringify(tables, null, 2));
        return;
      }
      if (format === "csv") {
        writer.write(renderAsCSV(tables));
        return;
      }
      if (tables.length === 0) {
        writer.warn("No untracked tables found.");
        return;
      }
      writer.write(
        chalk.green(
          `Found ${tables.length} untracked table(s) (${response.meta.totalCount} total):\n`,
        ),
      );
      writer.write(formatTable(tables, UNTRACKED_COLUMNS));
      writer.info(
        `\nTrack one with: observe inbound-share table track --share-id ${shareId} --schema <SCHEMA> --table <TABLE> ...`,
      );
      return;
    }

    writer.info("Fetching tracked tables...");

    const query = {
      config,
      filter,
      orderBy: flags.sort,
      limit: flags.limit,
      offset: flags.offset,
      expand: flags.expand,
    };
    const response =
      shareId === undefined
        ? await listAllImpl(query)
        : await listImpl({ ...query, shareId });
    const tables = response.tables;

    if (format === "json") {
      writer.write(JSON.stringify(tables, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(tables));
      return;
    }

    if (tables.length === 0) {
      writer.warn("No tracked tables found.");
      return;
    }

    writer.write(
      chalk.green(
        `Found ${tables.length} tracked table(s) (${response.meta.totalCount} total):\n`,
      ),
    );
    writer.write(
      formatTable(tables, shareId === undefined ? ALL_SHARES_COLUMNS : COLUMNS),
    );

    if (tables.length === flags.limit) {
      const nextOffset = (flags.offset ?? 0) + flags.limit;
      writer.info(
        `\nMore results may be available. Use --offset ${nextOffset} to see the next page.`,
      );
    }
  } catch (error) {
    if (shareId !== undefined && isNotFound(error)) {
      writer.error(`Share not found: ${shareId}`);
    } else {
      writer.error(`Error: ${await formatApiError(error)}`);
    }
    process.exitCode = 1;
  }
}

export const listCommand = defineCommand({
  experimental: true,
  loader: async () => list,
  parameters: {
    positional: { kind: "tuple", parameters: [] },
    flags: {
      shareId: {
        kind: "parsed",
        parse: String,
        brief:
          "ID of the share to list (default: tracked tables of all shares)",
        optional: true,
      },
      untracked: {
        kind: "boolean",
        brief:
          "List the tables in the share that are not tracked yet (needs --share-id)",
        optional: true,
      },
      match: {
        kind: "parsed",
        parse: String,
        brief: "Filter by table name substring (case-insensitive)",
        optional: true,
      },
      filter: {
        kind: "parsed",
        parse: String,
        brief: 'Filter with a CEL expression (e.g. schemaName == "PUBLIC")',
        optional: true,
      },
      sort: {
        kind: "parsed",
        parse: String,
        brief: "CEL expression to order by (prefix - for descending)",
        optional: true,
      },
      limit: {
        kind: "parsed",
        parse: parseLimit,
        brief: `Maximum number of tables to return (${MIN_LIMIT}-${MAX_LIMIT})`,
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
        brief: "Include share and dataset details (JSON/CSV output)",
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
      m: "match",
      f: "filter",
      l: "limit",
      s: "sort",
    },
  },
  docs: {
    brief:
      "List tracked tables, across all shares or in one (--untracked: not tracked yet)",
  },
});
