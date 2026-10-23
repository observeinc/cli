import { defineCommand } from "../../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../../context";
import { attachTableDataset } from "../../../rest/inbound-share/attach-table-dataset";
import type { AttachDatasetRequest } from "../../../rest/inbound-share/types";
import { loadConfig } from "../../../lib/config";
import { formatApiError } from "../../../lib/format-error";
import { muteStatusWriter } from "../../../lib/writer";
import { isNotFound } from "../shared";
import {
  buildAttachBody,
  parseSchemaMapping,
  type DatasetFlags,
} from "./parse";

interface AttachTableFlags extends DatasetFlags {
  shareId: string;
  json?: boolean;
}

export interface AttachTableDeps {
  loadConfig?: typeof loadConfig;
  attachTableDataset?: typeof attachTableDataset;
}

export async function attach(
  this: LocalContext,
  flags: AttachTableFlags,
  tableId: string,
  deps: AttachTableDeps = {},
): Promise<void> {
  const { shareId } = flags;
  const {
    loadConfig: loadConfigImpl = loadConfig,
    attachTableDataset: attachImpl = attachTableDataset,
  } = deps;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, { muted: flags.json === true });

  let body: AttachDatasetRequest;
  try {
    body = buildAttachBody(flags);
  } catch (e) {
    writer.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
    return;
  }

  try {
    const config = loadConfigImpl();

    writer.info("Creating dataset...");

    const table = await attachImpl({ config, shareId, tableId, body });

    if (flags.json) {
      writer.write(JSON.stringify(table, null, 2));
      return;
    }

    writer.write(
      chalk.green("Attached dataset ") +
        chalk.bold(table.sourceDataset?.id ?? "") +
        chalk.green(` to ${table.schemaName}.${table.tableName}`),
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

export const attachCommand = defineCommand({
  experimental: true,
  loader: async () => attach,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        { placeholder: "tableId", brief: "Tracked table ID", parse: String },
      ],
    },
    flags: {
      shareId: {
        kind: "parsed",
        parse: String,
        brief: "ID of the share the table belongs to",
        optional: false,
      },
      datasetLabel: {
        kind: "parsed",
        parse: String,
        brief: "Name of the Observe dataset to create",
      },
      kind: {
        kind: "enum",
        values: ["Table", "Event", "Interval"],
        brief: "Dataset kind (Table, Event, Interval)",
      },
      validFrom: {
        kind: "parsed",
        parse: String,
        brief: "Timestamp column for valid-from (Event and Interval)",
        optional: true,
      },
      validTo: {
        kind: "parsed",
        parse: String,
        brief: "Timestamp column for valid-to (Interval only)",
        optional: true,
      },
      schemaMapping: {
        kind: "parsed",
        parse: parseSchemaMapping,
        brief: "Column type mapping as a JSON object",
        optional: true,
      },
      json: {
        kind: "boolean",
        brief: "Output the table as JSON",
        optional: true,
      },
    },
    aliases: {},
  },
  docs: {
    brief: "Create a dataset for a tracked table that has none",
    fullDescription: [
      "Create an Observe dataset from a tracked table and attach it. A table that",
      "already has a dataset is rejected; detach it first with `table detach`.",
      "",
      "Example:",
      "  observe inbound-share table attach 41000200 --share-id 41000100 \\",
      "    --dataset-label Snowflake/orders --kind Event --valid-from CREATED_AT",
    ].join("\n"),
  },
});
