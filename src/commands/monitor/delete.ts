import { buildCommand } from "@stricli/core";
import type { LocalContext } from "../../context";
import { deleteMonitor } from "../../rest/monitor/delete-monitor";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { parseMonitorId } from "../../lib/parsers";

export interface DeleteMonitorDeps {
  loadConfig?: typeof loadConfig;
  deleteMonitor?: typeof deleteMonitor;
}

export async function deleteMonitorCommand(
  this: LocalContext,
  _flags: Record<string, never>,
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
    writer.error(`Invalid monitor ID: "${monitorId}". Must be a positive integer.`);
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
    flags: {},
    aliases: {},
  },
  docs: {
    brief: "Delete a monitor",
  },
});
