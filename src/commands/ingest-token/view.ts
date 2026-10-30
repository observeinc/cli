import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { getIngestToken } from "../../rest/ingest-token/get-ingest-token";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import { renderObject } from "../../lib/formatters/object";
import { renderAsCSV } from "../../lib/formatters/csv";

type OutputFormat = "json" | "csv";

interface ViewIngestTokenFlags {
  format?: OutputFormat;
  json?: boolean;
}

export interface ViewIngestTokenDeps {
  loadConfig?: typeof loadConfig;
  getIngestToken?: typeof getIngestToken;
}

export async function view(
  this: LocalContext,
  flags: ViewIngestTokenFlags,
  id: string,
  deps: ViewIngestTokenDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    getIngestToken: getIngestTokenImpl = getIngestToken,
  } = deps;
  const format = flags.json ? ("json" as const) : flags.format;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  try {
    const config = loadConfigImpl();
    writer.info("Fetching ingest token...");
    const token = await getIngestTokenImpl({ config, id });

    if (format === "json") {
      writer.write(JSON.stringify(token, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(token));
      return;
    }

    writer.write(chalk.bold.white(token.name));
    if (token.description) writer.write(chalk.dim(token.description));
    renderObject(token, (text) => writer.write(text), {
      title: "Ingest Token",
    });
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exitCode = 1;
  }
}

export const viewCommand = defineCommand({
  experimental: true,
  loader: async () => view,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        {
          placeholder: "tokenId",
          brief: "Ingest token ID",
          parse: String,
        },
      ],
    },
    flags: {
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
    aliases: {},
  },
  docs: {
    brief: "View an ingest token by ID",
    fullDescription:
      "View an ingest token and its usage stats. A token without stats has never been used.",
  },
});
