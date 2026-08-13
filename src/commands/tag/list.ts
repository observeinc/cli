import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { listTags } from "../../rest/tag/list-tags";
import type { TagEntry } from "../../rest/types/tags";
import { celFuzzyContains, combineFilters } from "../../lib/cel";
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

interface ListTagsFlags {
  match?: string;
  limit: number;
  "value-limit"?: number;
  format?: OutputFormat;
  json?: boolean;
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

/** Base scope predicate: tag search only surfaces correlation tags. */
const CORRELATION_KIND_FILTER = 'kind == "Correlation"';

const col = createColumnHelper<TagEntry>();

const columns: ColumnDef<TagEntry>[] = [
  col.accessor((row) => row.name, {
    header: "TAG KEY",
    format: (value) => chalk.yellow(value),
  }),
  col.accessor((row) => row.values.join(", "), {
    header: "TAG VALUES",
    flex: true,
  }),
];

export interface ListTagsDeps {
  loadConfig?: typeof loadConfig;
  listTags?: typeof listTags;
}

export async function list(
  this: LocalContext,
  flags: ListTagsFlags,
  deps: ListTagsDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    listTags: listRest = listTags,
  } = deps;
  const format = flags.json ? ("json" as const) : flags.format;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  try {
    const config = loadConfigImpl();

    writer.info("Searching for tags...");

    // Search runs against the REST `/v1/tags` endpoint. Build the CEL filter
    // here (correlation-kind scope AND'd with an optional case-insensitive
    // fuzzy match on the tag name) so the REST helper stays a thin wrapper.
    const response = await listRest({
      config,
      filter: combineFilters([
        CORRELATION_KIND_FILTER,
        flags.match ? celFuzzyContains("name", flags.match) : undefined,
      ]),
      limit: flags.limit,
      valueLimit: flags["value-limit"],
    });
    const { tags } = response;

    if (format === "json") {
      writer.write(JSON.stringify(tags, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(tags));
      return;
    }

    if (tags.length === 0) {
      writer.warn("No tags found.");
      return;
    }

    writer.write(chalk.green(`Found ${tags.length} tag(s):\n`));
    writer.write(formatTable(tags, columns));
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
        brief: "Search tags by keyword (case-insensitive substring)",
        optional: true,
      },
      limit: {
        kind: "parsed",
        parse: parseLimit,
        brief: `Maximum number of tags to return (${MIN_LIMIT}-${MAX_LIMIT})`,
        default: String(DEFAULT_LIMIT),
      },
      "value-limit": {
        kind: "parsed",
        parse: parseLimit,
        brief: `Maximum number of tag values to show per tag (${MIN_LIMIT}-${MAX_LIMIT})`,
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
    brief: "Search for tags",
  },
});
