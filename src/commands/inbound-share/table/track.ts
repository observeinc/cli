import { defineCommand } from "../../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../../context";
import { trackShareTable } from "../../../rest/inbound-share/track-share-table";
import type { TrackTableRequest } from "../../../rest/inbound-share/types";
import { loadConfig } from "../../../lib/config";
import { formatApiError } from "../../../lib/format-error";
import { muteStatusWriter } from "../../../lib/writer";
import { errorType, isNotFound } from "../shared";
import { buildTrackBody, parseSchemaMapping, type TrackFlags } from "./parse";

interface TrackTableFlags extends TrackFlags {
  shareId: string;
  json?: boolean;
}

export interface TrackTableDeps {
  loadConfig?: typeof loadConfig;
  trackShareTable?: typeof trackShareTable;
}

export async function track(
  this: LocalContext,
  flags: TrackTableFlags,
  deps: TrackTableDeps = {},
): Promise<void> {
  const { shareId } = flags;
  const {
    loadConfig: loadConfigImpl = loadConfig,
    trackShareTable: trackImpl = trackShareTable,
  } = deps;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, { muted: flags.json === true });

  let body: TrackTableRequest;
  try {
    body = buildTrackBody(flags);
  } catch (e) {
    writer.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
    return;
  }

  try {
    const config = loadConfigImpl();

    writer.info("Tracking table...");

    const { table, created } = await trackImpl({ config, shareId, body });

    if (flags.json) {
      writer.write(JSON.stringify(table, null, 2));
      return;
    }

    writer.write(
      chalk.green(created ? "Tracking table " : "Table already tracked: ") +
        chalk.bold(`${table.schemaName}.${table.tableName}`) +
        chalk.green(` (ID ${table.id})`),
    );
    if (table.sourceDataset) {
      writer.info(`Dataset: ${table.sourceDataset.id}`);
    }
  } catch (error) {
    if (isNotFound(error)) {
      writer.error(`Share not found: ${shareId}`);
    } else {
      writer.error(`Error: ${await formatApiError(error)}`);
      if ((await errorType(error)) === "cdc_not_enabled") {
        writer.error(
          "Enable change tracking on the table in your provider account (see `observe inbound-share setup`).",
        );
      }
    }
    process.exitCode = 1;
  }
}

export const trackCommand = defineCommand({
  experimental: true,
  loader: async () => track,
  parameters: {
    positional: { kind: "tuple", parameters: [] },
    flags: {
      shareId: {
        kind: "parsed",
        parse: String,
        brief: "ID of the share the table belongs to",
        optional: false,
      },
      schema: {
        kind: "parsed",
        parse: String,
        brief: "Snowflake schema that holds the table",
      },
      table: {
        kind: "parsed",
        parse: String,
        brief: "Snowflake table or view name",
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
      description: {
        kind: "parsed",
        parse: String,
        brief: "Description for the dataset",
        optional: true,
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
        brief: "Output the tracked table as JSON",
        optional: true,
      },
    },
    aliases: {},
  },
  docs: {
    brief: "Track a table in a share and create its dataset",
    fullDescription: [
      "Start tracking a shared table or view and create an Observe dataset for it.",
      "Tracking a table that is already tracked returns it unchanged.",
      "",
      "Example:",
      "  observe inbound-share table track --share-id 41000100 --schema PUBLIC --table ORDERS \\",
      "    --dataset-label Snowflake/orders --kind Event --valid-from CREATED_AT",
    ].join("\n"),
  },
});
