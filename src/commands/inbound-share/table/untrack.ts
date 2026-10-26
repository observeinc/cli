import { defineCommand } from "../../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../../context";
import { getShareTable } from "../../../rest/inbound-share/get-share-table";
import { untrackShareTable } from "../../../rest/inbound-share/untrack-share-table";
import { loadConfig } from "../../../lib/config";
import { formatApiError } from "../../../lib/format-error";
import { muteStatusWriter } from "../../../lib/writer";
import { requireYesWithJson } from "../shared";
import { confirm } from "../../../lib/confirm";

interface UntrackTableFlags {
  shareId: string;
  yes?: boolean;
  json?: boolean;
}

export interface UntrackTableDeps {
  loadConfig?: typeof loadConfig;
  getShareTable?: typeof getShareTable;
  untrackShareTable?: typeof untrackShareTable;
  confirm?: (question: string) => Promise<boolean>;
}

export async function untrack(
  this: LocalContext,
  flags: UntrackTableFlags,
  tableId: string,
  deps: UntrackTableDeps = {},
): Promise<void> {
  const { shareId } = flags;
  const {
    loadConfig: loadConfigImpl = loadConfig,
    getShareTable: getImpl = getShareTable,
    untrackShareTable: untrackImpl = untrackShareTable,
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
        `Untracking ${chalk.bold(`${table.schemaName}.${table.tableName}`)} also deletes its dataset${dataset ? ` "${dataset}"` : ""}. This cannot be undone.`,
      );
      const confirmed = await confirmImpl("Untrack this table?");
      if (!confirmed) {
        writer.error("Aborted. Re-run with --yes to skip this prompt.");
        process.exitCode = 1;
        return;
      }
    }

    await untrackImpl({ config, shareId, tableId });

    if (flags.json) {
      writer.write(JSON.stringify({ success: true, id: tableId }, null, 2));
      return;
    }

    writer.write(
      chalk.green(
        `Untracked table ${chalk.bold(tableId)}${flags.yes ? " (or it was already untracked)" : ""}.`,
      ),
    );
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exitCode = 1;
  }
}

export const untrackCommand = defineCommand({
  experimental: true,
  loader: async () => untrack,
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
    brief: "Stop tracking a table and delete its dataset",
  },
});
