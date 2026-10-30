import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { listIngestTokens } from "../../rest/ingest-token/list-ingest-tokens";
import type { IngestTokenResource } from "../../rest/generated";
import { loadConfig } from "../../lib/config";
import { celMatchesInsensitive } from "../../lib/cel";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import { parseNonNegativeInt } from "../../lib/parsers";
import { formatDate } from "../../lib/formatters/date";
import {
  createColumnHelper,
  formatTable,
  type ColumnDef,
} from "../../lib/formatters/table";
import { renderAsCSV } from "../../lib/formatters/csv";

type OutputFormat = "json" | "csv";

const AVAILABLE_FIELDS = [
  "id",
  "name",
  "description",
  "status",
  "createdAt",
  "updatedAt",
  "firstUsed",
  "lastUsed",
  "lastIngest",
] as const;

type FieldName = (typeof AVAILABLE_FIELDS)[number];

const DEFAULT_FIELDS: FieldName[] = ["id", "name", "status", "updatedAt"];

interface ListIngestTokenFlags {
  match?: string;
  expand?: boolean;
  limit: number;
  offset?: number;
  format?: OutputFormat;
  json?: boolean;
  fields?: FieldName[];
}

export interface ListIngestTokenDeps {
  loadConfig?: typeof loadConfig;
  listIngestTokens?: typeof listIngestTokens;
}

const col = createColumnHelper<IngestTokenResource>();

const FIELD_COLUMNS = {
  id: col.accessor((row) => row.id, {
    header: "ID",
    format: (value) => chalk.cyan(value),
  }),
  name: col.accessor((row) => row.name, { header: "NAME" }),
  description: col.accessor((row) => row.description || "-", {
    header: "DESCRIPTION",
    flex: true,
  }),
  status: col.accessor((row) => row.disabled, {
    header: "STATUS",
    format: (disabled) =>
      disabled ? chalk.yellow("disabled") : chalk.green("enabled"),
  }),
  createdAt: col.accessor((row) => row.createdAt, {
    header: "CREATED",
    format: formatDate,
  }),
  updatedAt: col.accessor((row) => row.updatedAt, {
    header: "UPDATED",
    format: formatDate,
  }),
  firstUsed: col.accessor((row) => row.stats?.firstUsed, {
    header: "FIRST USED",
    format: (value) => (value ? formatDate(value) : "-"),
  }),
  lastUsed: col.accessor((row) => row.stats?.lastUsed, {
    header: "LAST USED",
    format: (value) => (value ? formatDate(value) : "-"),
  }),
  lastIngest: col.accessor((row) => row.stats?.lastIngest, {
    header: "LAST INGEST",
    format: (value) => (value ? formatDate(value) : "-"),
  }),
} satisfies Record<FieldName, ColumnDef<IngestTokenResource>>;

export async function list(
  this: LocalContext,
  flags: ListIngestTokenFlags,
  deps: ListIngestTokenDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    listIngestTokens: listIngestTokensImpl = listIngestTokens,
  } = deps;
  const format = flags.json ? ("json" as const) : flags.format;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  try {
    const config = loadConfigImpl();
    writer.info("Fetching ingest tokens...");

    const response = await listIngestTokensImpl({
      config,
      filter: flags.match
        ? celMatchesInsensitive("name", flags.match)
        : undefined,
      expand: flags.expand,
      offset: flags.offset,
      limit: flags.limit,
    });
    const tokens = response.tokens;

    if (format === "json") {
      writer.write(JSON.stringify(tokens, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(tokens));
      return;
    }

    if (tokens.length === 0) {
      writer.warn("No ingest tokens found.");
      return;
    }

    const totalCount = response.meta.totalCount;
    const summary =
      totalCount >= 0
        ? `Found ${tokens.length} ingest token(s) (${totalCount} total):\n`
        : `Found ${tokens.length} ingest token(s):\n`;
    writer.write(chalk.green(summary));

    const fieldNames = flags.fields ?? DEFAULT_FIELDS;
    const columns = fieldNames.map((field) => FIELD_COLUMNS[field]);
    writer.write(formatTable(tokens, columns));

    const nextOffset = (flags.offset ?? 0) + tokens.length;
    const more =
      totalCount >= 0 ? nextOffset < totalCount : tokens.length === flags.limit;
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

const MIN_LIMIT = 1;
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 100;

function parseLimit(value: string) {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < MIN_LIMIT || limit > MAX_LIMIT) {
    throw new Error(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`);
  }
  return limit;
}

function parseFields(value: string): FieldName[] {
  const fields = value.split(",").map((field) => field.trim()) as FieldName[];
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
  experimental: true,
  loader: async () => list,
  parameters: {
    positional: { kind: "tuple", parameters: [] },
    flags: {
      match: {
        kind: "parsed",
        parse: String,
        brief: "Filter by name substring (case-insensitive)",
        optional: true,
      },
      expand: {
        kind: "boolean",
        brief:
          "Include usage stats; when expanded, missing stats means the token has never been used",
        optional: true,
      },
      limit: {
        kind: "parsed",
        parse: parseLimit,
        brief: `Maximum number of ingest tokens to return (${MIN_LIMIT}-${MAX_LIMIT})`,
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
        brief: `Comma-separated list of fields: ${AVAILABLE_FIELDS.join(", ")}`,
        optional: true,
      },
    },
    aliases: { l: "limit" },
  },
  docs: {
    brief: "List ingest tokens",
    fullDescription: [
      "List one page of ingest tokens.",
      "",
      "Use --expand to include usage statistics. When --expand is set, a token",
      "without stats has never been used. Use --json to inspect the full stats",
      "time series or --fields firstUsed,lastUsed for a compact table.",
    ].join("\n"),
  },
});
