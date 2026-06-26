import { buildCommand } from "@stricli/core";
import type { LocalContext } from "../../context";
import { deleteMonitor } from "../../rest/monitor/delete-monitor";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { parseMonitorId } from "../../lib/parsers";

interface DeleteMonitorFlags {
  force?: boolean;
}

export interface DeleteMonitorDeps {
  loadConfig?: typeof loadConfig;
  deleteMonitor?: typeof deleteMonitor;
}

export async function deleteMonitorCommand(
  this: LocalContext,
  flags: DeleteMonitorFlags,
  monitorId: string,
  deps: DeleteMonitorDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    deleteMonitor: deleteMonitorImpl = deleteMonitor,
  } = deps;
  const { process, writer } = this;

  let id: number;
  try {
    id = parseMonitorId(monitorId);
  } catch {
    writer.error(
      `Invalid monitor ID: "${monitorId}". Must be a positive integer.`,
    );
    process.exit(1);
    return;
  }

  if (!flags.force) {
    writer.error(`Deleting a monitor is irreversible. Use --force to confirm.`);
    process.exit(1);
    return;
  }

  try {
    const config = loadConfigImpl();

    writer.info("Deleting monitor...");

    await deleteMonitorImpl({ config, id });

    writer.success(`Monitor ${monitorId} deleted.`);
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exit(1);
  }
}

export const deleteCommand = buildCommand({
  loader: async () => deleteMonitorCommand,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [{ brief: "Monitor ID", parse: String }],
    },
    flags: {
      force: {
        kind: "boolean",
        brief: "Confirm deletion (required — deletion is irreversible)",
        optional: true,
      },
    },
    aliases: {},
  },
  docs: {
    brief: "Delete a monitor",
  },
});
