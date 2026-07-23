import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { listTagValues } from "../../rest/tag-value/list-tag-values";
import { listTagValuesKGDeprecated } from "../../rest/tag-value/list-tag-values-kg-deprecated";
import type { TagValuePair } from "../../rest/types/tag-values";
import { TagValuesSearchMode } from "../../rest/generated";
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

interface ListTagValuesFlags {
  match?: string;
  mode?: SearchMode;
  limit: number;
  format?: OutputFormat;
  json?: boolean;
}

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

const col = createColumnHelper<TagValuePair>();

const columns: ColumnDef<TagValuePair>[] = [
  col.accessor((row) => row.name, {
    header: "TAG KEY",
    format: (value) => chalk.yellow(value),
  }),
  col.accessor((row) => row.value, {
    header: "TAG VALUE",
    flex: true,
  }),
];

export interface ListTagValuesDeps {
  loadConfig?: typeof loadConfig;
  listTagValues?: typeof listTagValues;
  listTagValuesKGDeprecated?: typeof listTagValuesKGDeprecated;
  isExperimentalEnabled?: typeof isExperimentalEnabled;
}

export async function list(
  this: LocalContext,
  flags: ListTagValuesFlags,
  deps: ListTagValuesDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    listTagValues: listRest = listTagValues,
    listTagValuesKGDeprecated: listKG = listTagValuesKGDeprecated,
    isExperimentalEnabled: isExperimentalEnabledImpl = isExperimentalEnabled,
  } = deps;
  const format = flags.json ? ("json" as const) : flags.format;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  try {
    const config = loadConfigImpl();

    writer.info("Searching for tag values...");

    // When experimental mode is on, search runs against the REST
    // `/v1/tags/values` endpoint. The endpoint requires a `query`, so resolve
    // the match-all fallback and map `--mode` onto the API enum here, keeping
    // the REST helper a thin wrapper. With no query the semantic backend has
    // nothing to rank against, so fall back to a match-all regex. Otherwise it
    // uses the deprecated V2 Knowledge Graph path.
    const match = flags.match ?? "";
    const response = isExperimentalEnabledImpl()
      ? await listRest({
          config,
          query: match !== "" ? match : ".*",
          mode:
            match !== "" && flags.mode === "semantic"
              ? TagValuesSearchMode.Semantic
              : TagValuesSearchMode.Regex,
          limit: flags.limit,
        })
      : await listKG({
          config,
          match: flags.match,
          mode: flags.mode,
          limit: flags.limit,
        });
    const { tagValuePairs } = response;

    if (format === "json") {
      writer.write(JSON.stringify(tagValuePairs, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(tagValuePairs));
      return;
    }

    if (tagValuePairs.length === 0) {
      writer.warn("No tag values found.");
      return;
    }

    writer.write(chalk.green(`Found ${tagValuePairs.length} tag value(s):\n`));
    writer.write(formatTable(tagValuePairs, columns));
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
        brief: "Search tag values by keyword or pattern",
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
        brief: `Maximum number of tag values to return (${MIN_LIMIT}-${MAX_LIMIT})`,
        default: String(DEFAULT_LIMIT),
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
      "Search for tag values (knowledge graph; REST /v1/tags/values with OBSERVE_CLI_EXPERIMENTAL)",
  },
});
