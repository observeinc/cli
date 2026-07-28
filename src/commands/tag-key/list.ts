import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { listTagKeys } from "../../rest/tag-key/list-tag-keys";
import { listTagKeysKGDeprecated } from "../../rest/tag-key/list-tag-keys-kg-deprecated";
import type { TagKeyEntry } from "../../rest/types/tag-keys";
import { celFuzzyContains, combineFilters } from "../../lib/cel";
import { isExperimentalEnabled } from "../../lib/experimental";
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

/** Base scope predicate: tag-key search only surfaces correlation tags. */
const CORRELATION_KIND_FILTER = 'kind == "Correlation"';

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
  listTagKeys?: typeof listTagKeys;
  listTagKeysKGDeprecated?: typeof listTagKeysKGDeprecated;
  isExperimentalEnabled?: typeof isExperimentalEnabled;
}

export async function list(
  this: LocalContext,
  flags: ListTagKeysFlags,
  deps: ListTagKeysDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    listTagKeys: listRest = listTagKeys,
    listTagKeysKGDeprecated: listKG = listTagKeysKGDeprecated,
    isExperimentalEnabled: isExperimentalEnabledImpl = isExperimentalEnabled,
  } = deps;
  const format = flags.json ? ("json" as const) : flags.format;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  try {
    const config = loadConfigImpl();

    writer.info("Searching for tag keys...");

    // When experimental mode is on, search runs against the REST `/v1/tags`
    // endpoint. Build the CEL filter here (correlation-kind scope AND'd with an
    // optional case-insensitive fuzzy match on the tag name) so the REST helper
    // stays a thin wrapper. Otherwise it uses the deprecated V2 Knowledge Graph
    // path, which also supports semantic `--mode`.
    const response = isExperimentalEnabledImpl()
      ? await listRest({
          config,
          filter: combineFilters([
            CORRELATION_KIND_FILTER,
            flags.match ? celFuzzyContains("name", flags.match) : undefined,
          ]),
          limit: flags.limit,
          valueLimit: flags["value-limit"],
        })
      : await listKG({
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
    brief:
      "Search for tag keys (knowledge graph; REST /v1/tags with OBSERVE_CLI_EXPERIMENTAL)",
  },
});
