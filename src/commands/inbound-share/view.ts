import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { getShare } from "../../rest/inbound-share/get-share";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import { renderObject } from "../../lib/formatters/object";
import { renderAsCSV } from "../../lib/formatters/csv";
import { isNotFound, type OutputFormat } from "./shared";

interface ViewShareFlags {
  format?: OutputFormat;
  json?: boolean;
}

export interface ViewShareDeps {
  loadConfig?: typeof loadConfig;
  getShare?: typeof getShare;
}

export async function view(
  this: LocalContext,
  flags: ViewShareFlags,
  shareId: string,
  deps: ViewShareDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    getShare: getImpl = getShare,
  } = deps;
  const format = flags.json ? ("json" as const) : flags.format;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  try {
    const config = loadConfigImpl();

    writer.info("Fetching share...");

    const share = await getImpl({ config, shareId });

    if (format === "json") {
      writer.write(JSON.stringify(share, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(share));
      return;
    }

    writer.write(chalk.bold.white(share.label));
    renderObject(
      {
        id: share.id,
        shareName: share.shareName,
        providerAccount: share.providerAccount,
        state: share.status.state,
        health: share.status.health,
        healthMessage: share.status.healthMessage ?? undefined,
        lastHealthCheckAt: share.status.lastHealthCheckAt ?? undefined,
        tableCount: share.tableCount,
        createdAt: share.createdAt,
        updatedAt: share.updatedAt,
      },
      (text) => writer.write(text),
    );
  } catch (error) {
    if (isNotFound(error)) {
      writer.error(`Share not found: ${shareId}`);
    } else {
      writer.error(`Error: ${await formatApiError(error)}`);
    }
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
        { placeholder: "shareId", brief: "Share ID", parse: String },
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
    brief: "View details of a registered share",
  },
});
