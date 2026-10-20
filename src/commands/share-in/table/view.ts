import { defineCommand } from "../../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../../context";
import { getShareTable } from "../../../rest/share-in/get-share-table";
import { loadConfig } from "../../../lib/config";
import { formatApiError } from "../../../lib/format-error";
import { muteStatusWriter } from "../../../lib/writer";
import { renderObject } from "../../../lib/formatters/object";
import { renderAsCSV } from "../../../lib/formatters/csv";
import { isNotFound, type OutputFormat } from "../shared";

interface ViewTableFlags {
  expand?: boolean;
  format?: OutputFormat;
  json?: boolean;
}

export interface ViewTableDeps {
  loadConfig?: typeof loadConfig;
  getShareTable?: typeof getShareTable;
}

export async function view(
  this: LocalContext,
  flags: ViewTableFlags,
  shareId: string,
  tableId: string,
  deps: ViewTableDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    getShareTable: getImpl = getShareTable,
  } = deps;
  const format = flags.json ? ("json" as const) : flags.format;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  try {
    const config = loadConfigImpl();

    writer.info("Fetching tracked table...");

    const table = await getImpl({
      config,
      shareId,
      tableId,
      expand: flags.expand,
    });

    if (format === "json") {
      writer.write(JSON.stringify(table, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(table));
      return;
    }

    writer.write(chalk.bold.white(`${table.schemaName}.${table.tableName}`));
    renderObject(
      {
        id: table.id,
        shareId: table.share.id,
        tableType: table.tableType,
        status: table.status,
        health: table.health,
        cdcStatus: table.cdcStatus,
        datasetId: table.sourceDataset?.id,
        datasetLabel: table.sourceDataset?.record?.label,
        columns: table.tableSchema?.columns.map((c) => ({
          name: c.name,
          type: c.type,
        })),
        createdAt: table.createdAt,
        updatedAt: table.updatedAt,
      },
      (text) => writer.write(text),
    );
  } catch (error) {
    if (isNotFound(error)) {
      writer.error(`Tracked table not found: ${tableId} in share ${shareId}`);
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
        { placeholder: "tableId", brief: "Tracked table ID", parse: String },
      ],
    },
    flags: {
      expand: {
        kind: "boolean",
        brief: "Include share and dataset details",
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
    aliases: {},
  },
  docs: {
    brief: "View details of a tracked table",
  },
});
