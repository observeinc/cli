import { defineCommand } from "../../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../../context";
import { updateShareTable } from "../../../rest/share-in/update-share-table";
import type { TableUpdateRequest } from "../../../rest/share-in/types";
import { loadConfig } from "../../../lib/config";
import { formatApiError } from "../../../lib/format-error";
import { muteStatusWriter } from "../../../lib/writer";
import { isNotFound } from "../shared";
import {
  buildTableUpdateBody,
  parseSchemaMapping,
  type TableUpdateFlags,
} from "./parse";

interface UpdateTableFlags extends TableUpdateFlags {
  json?: boolean;
}

export interface UpdateTableDeps {
  loadConfig?: typeof loadConfig;
  updateShareTable?: typeof updateShareTable;
}

export async function update(
  this: LocalContext,
  flags: UpdateTableFlags,
  shareId: string,
  tableId: string,
  deps: UpdateTableDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    updateShareTable: updateImpl = updateShareTable,
  } = deps;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, { muted: flags.json === true });

  let body: TableUpdateRequest;
  try {
    body = buildTableUpdateBody(flags);
  } catch (e) {
    writer.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
    return;
  }

  try {
    const config = loadConfigImpl();

    writer.info("Updating tracked table...");

    const table = await updateImpl({ config, shareId, tableId, body });

    if (flags.json) {
      writer.write(JSON.stringify(table, null, 2));
      return;
    }

    writer.write(
      chalk.green("Updated tracked table ") +
        chalk.bold(`${table.schemaName}.${table.tableName}`) +
        chalk.green(` (ID ${table.id})`),
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

export const updateCommand = defineCommand({
  experimental: true,
  loader: async () => update,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        { placeholder: "shareId", brief: "Share ID", parse: String },
        { placeholder: "tableId", brief: "Tracked table ID", parse: String },
      ],
    },
    flags: {
      description: {
        kind: "parsed",
        parse: String,
        brief: "New dataset description",
        optional: true,
      },
      datasetLabel: {
        kind: "parsed",
        parse: String,
        brief: "New dataset name",
        optional: true,
      },
      validFrom: {
        kind: "parsed",
        parse: String,
        brief: "New valid-from column (Event and Interval)",
        optional: true,
      },
      validTo: {
        kind: "parsed",
        parse: String,
        brief: "New valid-to column (Interval only)",
        optional: true,
      },
      schemaMapping: {
        kind: "parsed",
        parse: parseSchemaMapping,
        brief: "New column type mapping as a JSON object",
        optional: true,
      },
      json: {
        kind: "boolean",
        brief: "Output the updated table as JSON",
        optional: true,
      },
    },
    aliases: {},
  },
  docs: {
    brief: "Update a tracked table's dataset settings",
    fullDescription: [
      "Only the fields you pass are changed. The table, schema and dataset kind",
      "are fixed; a time field that would change the kind is rejected.",
      "",
      "Example:",
      "  observe share-in table update 41000100 41000200 --dataset-label Snowflake/orders-v2",
    ].join("\n"),
  },
});
