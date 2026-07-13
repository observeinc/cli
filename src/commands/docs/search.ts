import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { searchDocs } from "../../rest/docs/search-docs";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import { renderAsCSV } from "../../lib/formatters/csv";

type OutputFormat = "json" | "csv";

interface SearchDocsFlags {
  limit: number;
  minScore?: number;
  format?: OutputFormat;
  json?: boolean;
}

const DEFAULT_LIMIT = 5;
const MIN_LIMIT = 1;
const MAX_LIMIT = 50;

async function search(
  this: LocalContext,
  flags: SearchDocsFlags,
  query: string,
): Promise<void> {
  const format = flags.json ? ("json" as const) : flags.format;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  try {
    const config = loadConfig();

    writer.info("Searching documentation...");

    const response = await searchDocs({
      config,
      query,
      limit: flags.limit,
      minScore: flags.minScore,
    });

    const results = response.documentation;

    if (format === "json") {
      writer.write(JSON.stringify(results, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(results));
      return;
    }

    if (results.length === 0) {
      writer.warn("No documentation found.");
      return;
    }

    writer.write(chalk.green(`Found ${results.length} result(s):\n`));

    results.forEach((result, index) => {
      writer.write(chalk.bold.cyan(`${index + 1}. ${result.title}`));
      if (result.url) {
        writer.write(chalk.blue(result.url));
      }
      writer.write(result.text.trim());
      writer.write("");
    });
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exit(1);
  }
}

function parseLimit(value: string): number {
  const num = Number(value);
  if (isNaN(num) || num < MIN_LIMIT || num > MAX_LIMIT) {
    throw new Error(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`);
  }
  return num;
}

function parseMinScore(value: string): number {
  const num = Number(value);
  if (isNaN(num) || num < 0 || num > 1) {
    throw new Error("Min score must be between 0 and 1");
  }
  return num;
}

export const searchCommand = defineCommand({
  loader: async () => search,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        {
          brief: "Natural-language search query",
          parse: String,
          placeholder: "query",
        },
      ],
    },
    flags: {
      limit: {
        kind: "parsed",
        parse: parseLimit,
        brief: `Maximum number of results to return (${MIN_LIMIT}-${MAX_LIMIT})`,
        default: String(DEFAULT_LIMIT),
      },
      minScore: {
        kind: "parsed",
        parse: parseMinScore,
        brief:
          "Minimum cosine similarity score (0-1); lower scores are excluded",
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
    },
  },
  docs: {
    brief: "Search Observe's documentation",
  },
});
