import { defineCommand } from "../../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../../context";
import { getShareTable } from "../../../rest/inbound-share/get-share-table";
import { detachTableDataset } from "../../../rest/inbound-share/detach-table-dataset";
import { loadConfig } from "../../../lib/config";
import { formatApiError } from "../../../lib/format-error";
import { muteStatusWriter } from "../../../lib/writer";
import { confirm, isNotFound, requireYesWithJson } from "../shared";

interface DetachTableFlags {
  shareId: string;
  yes?: boolean;
  json?: boolean;
}

export interface DetachTableDeps {
  loadConfig?: typeof loadConfig;
  getShareTable?: typeof getShareTable;
  detachTableDataset?: typeof detachTableDataset;
  confirm?: (question: string) => Promise<boolean>;
}

export async function detach(
  this: LocalContext,
  flags: DetachTableFlags,
  tableId: string,
  deps: DetachTableDeps = {},
): Promise<void> {
  const { shareId } = flags;
  const {
    loadConfig: loadConfigImpl = loadConfig,
    getShareTable: getImpl = getShareTable,
    detachTableDataset: detachImpl = detachTableDataset,
    confirm: confirmImpl = (question: string) => confirm.call(this, question),
  } = deps;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, { muted: flags.json === true });
  if (!requireYesWithJson.call(this, flags)) return;

  try {
    const config = loadConfigImpl();

    if (!flags.yes) {
      const table = await getImpl({
        config,
        shareId,
        tableId,
        expand: true,
      });
      const dataset = table.sourceDataset?.record?.label;
      writer.warn(
        `Detaching deletes the dataset${dataset ? ` "${dataset}"` : ""} of ${chalk.bold(`${table.schemaName}.${table.tableName}`)}. The table stays tracked. This cannot be undone.`,
      );
      const confirmed = await confirmImpl("Detach and delete the dataset?");
      if (!confirmed) {
        writer.error("Aborted. Re-run with --yes to skip this prompt.");
        process.exitCode = 1;
        return;
      }
    }

    await detachImpl({ config, shareId, tableId });

    if (flags.json) {
      writer.write(JSON.stringify({ success: true, id: tableId }, null, 2));
      return;
    }

    writer.write(
      chalk.green(`Detached the dataset from table ${chalk.bold(tableId)}.`),
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

export const detachCommand = defineCommand({
  experimental: true,
  loader: async () => detach,
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
      yes: {
        kind: "boolean",
        brief: "Skip the confirmation prompt",
        optional: true,
      },
      json: {
        kind: "boolean",
        brief: "Output the result as JSON (requires --yes)",
        optional: true,
      },
    },
    aliases: {
      y: "yes",
    },
  },
  docs: {
    brief: "Delete a tracked table's dataset and keep the table tracked",
  },
});
