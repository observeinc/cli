import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { listShares } from "../../rest/inbound-share/list-shares";
import type {
  HealthStatus,
  ShareListItem,
  ShareState,
} from "../../rest/inbound-share/types";
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
import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MIN_LIMIT,
  parseLimit,
  type OutputFormat,
} from "./shared";

interface ListSharesFlags {
  state?: ShareState;
  health?: HealthStatus;
  sort?: string;
  limit: number;
  offset?: number;
  format?: OutputFormat;
  json?: boolean;
}

const col = createColumnHelper<ShareListItem>();

const COLUMNS: ColumnDef<ShareListItem>[] = [
  col.accessor((row) => row.id, {
    header: "ID",
    format: (value) => chalk.cyan(value),
  }),
  col.accessor((row) => row.label, { header: "LABEL" }),
  col.accessor((row) => row.shareName, { header: "SHARE" }),
  col.accessor((row) => row.providerAccount, {
    header: "PROVIDER",
    format: (value) => chalk.dim(value),
  }),
  col.accessor((row) => row.status.state, { header: "STATE" }),
  col.accessor((row) => row.status.health, { header: "HEALTH" }),
  col.accessor((row) => String(row.tableCount), { header: "TABLES" }),
];

export interface ListSharesDeps {
  loadConfig?: typeof loadConfig;
  listShares?: typeof listShares;
}

export async function list(
  this: LocalContext,
  flags: ListSharesFlags,
  deps: ListSharesDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    listShares: listImpl = listShares,
  } = deps;
  const format = flags.json ? ("json" as const) : flags.format;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  try {
    const config = loadConfigImpl();

    writer.info("Fetching shares...");

    const response = await listImpl({
      config,
      status: flags.state,
      healthStatus: flags.health,
      orderBy: flags.sort,
      limit: flags.limit,
      offset: flags.offset,
    });
    const shares = response.shares;

    if (format === "json") {
      writer.write(JSON.stringify(shares, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(shares));
      return;
    }

    if (shares.length === 0) {
      writer.warn("No shares found.");
      return;
    }

    writer.write(
      chalk.green(
        `Found ${shares.length} share(s) (${response.meta.totalCount} total):\n`,
      ),
    );
    writer.write(formatTable(shares, COLUMNS));

    if (shares.length === flags.limit) {
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

export const listCommand = defineCommand({
  experimental: true,
  loader: async () => list,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
    flags: {
      state: {
        kind: "enum",
        values: ["Creating", "Active", "Deleting", "Unknown"],
        brief: "Only shares in this state",
        optional: true,
      },
      health: {
        kind: "enum",
        values: ["Healthy", "Unhealthy", "Unknown"],
        brief: "Only shares with this health",
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
        brief: `Maximum number of shares to return (${MIN_LIMIT}-${MAX_LIMIT})`,
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
    },
    aliases: {
      l: "limit",
      s: "sort",
    },
  },
  docs: {
    brief: "List registered shares",
  },
});
