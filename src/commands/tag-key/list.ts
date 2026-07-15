import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { listTagKeys } from "../../rest/tag-key/list-tag-keys";
import type { TagKeyEntry } from "../../rest/types/tag-keys";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import {
  formatTable,
  createColumnHelper,
  type ColumnDef,
} from "../../lib/formatters/table";
import { renderAsCSV } from "../../lib/formatters/csv";

type OutputFormat = "json" | "csv";
type SearchMode = "semantic" | "regex";

interface ListTagKeysFlags {
  match?: string;
  mode?: SearchMode;
  limit: number;
  "value-limit"?: number;
  format?: OutputFormat;
  json?: boolean;
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

const col = createColumnHelper<TagKeyEntry>();

const columns: ColumnDef<TagKeyEntry>[] = [
  col.accessor((row) => row.name, {
    header: "TAG KEY",
    format: (value) => chalk.yellow(value),
  }),
  col.accessor((row) => row.values.join(", "), {
    header: "TAG VALUES",
    flex: true,
  }),
];

export interface ListTagKeysDeps {
  loadConfig?: typeof loadConfig;
}

export async function list(
  this: LocalContext,
  flags: ListTagKeysFlags,
  deps: ListTagKeysDeps = {},
): Promise<void> {
  const { loadConfig: loadConfigImpl = loadConfig } = deps;
  const format = flags.json ? ("json" as const) : flags.format;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  try {
    const config = loadConfigImpl();

    writer.info("Searching for tag keys...");

    const response = await listTagKeys({
      config,
      match: flags.match,
      mode: flags.mode,
      limit: flags.limit,
      valueLimit: flags["value-limit"],
    });
    const { tagKeys } = response;

    if (format === "json") {
      writer.write(JSON.stringify(tagKeys, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(tagKeys));
      return;
    }

    if (tagKeys.length === 0) {
      writer.warn("No tag keys found.");
      return;
    }

    writer.write(chalk.green(`Found ${tagKeys.length} tag key(s):\n`));
    writer.write(formatTable(tagKeys, columns));
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exitCode = 1;
  }
}

function parseLimit(value: string): number {
  const num = Number(value);
  if (isNaN(num) || num < MIN_LIMIT || num > MAX_LIMIT) {
    throw new Error(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`);
  }
  return num;
}

export const listCommand = defineCommand({
  loader: async () => list,
  parameters: {
    flags: {
      match: {
        kind: "parsed",
        parse: String,
        brief: "Search tag keys by keyword or pattern",
        optional: true,
      },
      mode: {
        kind: "enum",
        values: ["semantic", "regex"],
        brief: "Search mode (default: semantic)",
        optional: true,
      },
      limit: {
        kind: "parsed",
        parse: parseLimit,
        brief: `Maximum number of tag keys to return (${MIN_LIMIT}-${MAX_LIMIT})`,
        default: String(DEFAULT_LIMIT),
      },
      "value-limit": {
        kind: "parsed",
        parse: parseLimit,
        brief: `Maximum number of tag values to show per key (${MIN_LIMIT}-${MAX_LIMIT})`,
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
      l: "limit",
    },
  },
  docs: {
    brief: "Search for tag keys in the knowledge graph",
  },
});
