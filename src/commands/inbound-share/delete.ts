import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { getShare } from "../../rest/inbound-share/get-share";
import { deleteShare } from "../../rest/inbound-share/delete-share";
import { loadConfig } from "../../lib/config";
import { errorType, formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import { requireYesWithJson } from "./shared";
import { confirm } from "../../lib/confirm";

interface DeleteShareFlags {
  yes?: boolean;
  force?: boolean;
  json?: boolean;
}

export interface DeleteShareDeps {
  loadConfig?: typeof loadConfig;
  getShare?: typeof getShare;
  deleteShare?: typeof deleteShare;
  confirm?: (question: string) => Promise<boolean>;
}

export async function remove(
  this: LocalContext,
  flags: DeleteShareFlags,
  shareId: string,
  deps: DeleteShareDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    getShare: getImpl = getShare,
    deleteShare: deleteImpl = deleteShare,
    confirm: confirmImpl = (question: string) => confirm.call(this, question),
  } = deps;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, { muted: flags.json === true });
  if (!requireYesWithJson.call(this, flags)) return;

  try {
    const config = loadConfigImpl();

    if (flags.force) {
      writer.warn(
        "--force also untracks every table in the share and deletes the datasets attached to them.",
      );
    }

    if (!flags.yes) {
      const share = await getImpl({ config, shareId });
      writer.warn(
        `Deleting share ${chalk.bold(shareId)} ("${share.label}") drops Observe's copy of it. Your Snowflake share is not changed.`,
      );
      const confirmed = await confirmImpl("Delete this share?");
      if (!confirmed) {
        writer.error("Aborted. Re-run with --yes to skip this prompt.");
        process.exitCode = 1;
        return;
      }
    }

    await deleteImpl({ config, shareId, force: flags.force });

    if (flags.json) {
      writer.write(JSON.stringify({ success: true, id: shareId }, null, 2));
      return;
    }

    writer.write(
      chalk.green(
        `Deleted share ${chalk.bold(shareId)}${flags.yes ? " (or it was already gone)" : ""}.`,
      ),
    );
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    if ((await errorType(error)) === "share_has_tracked_tables") {
      writer.error(
        "Untrack its tables first (observe inbound-share table untrack), or re-run with --force.",
      );
    }
    process.exitCode = 1;
  }
}

export const deleteCommand = defineCommand({
  experimental: true,
  loader: async () => remove,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        { placeholder: "shareId", brief: "Share ID", parse: String },
      ],
    },
    flags: {
      yes: {
        kind: "boolean",
        brief: "Skip the confirmation prompt",
        optional: true,
      },
      force: {
        kind: "boolean",
        brief:
          "Delete even when tables are tracked (untracks them and deletes their datasets)",
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
    brief: "Delete a registered share",
    fullDescription: [
      "Delete a share from Observe and drop the database Observe created for it.",
      "Your Snowflake share and its data are not changed.",
      "",
      "A share with tracked tables is refused unless you pass --force, which",
      "untracks the tables and deletes their datasets first.",
    ].join("\n"),
  },
});
