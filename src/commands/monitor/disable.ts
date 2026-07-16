import { defineCommand } from "../../lib/stricli-wrappers";
import type { LocalContext } from "../../context";
import { updateMonitor } from "../../rest/monitor/update-monitor";
import { getMonitor } from "../../rest/monitor/get-monitor";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import { parseMonitorId } from "../../lib/parsers";

interface DisableMonitorFlags {
  json?: boolean;
}

export interface DisableMonitorDeps {
  loadConfig?: typeof loadConfig;
  updateMonitor?: typeof updateMonitor;
  getMonitor?: typeof getMonitor;
}

export async function disable(
  this: LocalContext,
  flags: DisableMonitorFlags,
  monitorId: string,
  deps: DisableMonitorDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    updateMonitor: updateMonitorImpl = updateMonitor,
    getMonitor: getMonitorImpl = getMonitor,
  } = deps;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, { muted: flags.json === true });

  let id: number;
  try {
    id = parseMonitorId(monitorId);
  } catch {
    writer.error(
      `Invalid monitor ID: "${monitorId}". Must be a positive integer.`,
    );
    process.exitCode = 1;
    return;
  }

  try {
    const config = loadConfigImpl();

    writer.info("Disabling monitor...");

    await updateMonitorImpl({ config, id, disabled: true });

    if (flags.json) {
      const result = await getMonitorImpl({ config, id });
      if (!result) {
        throw new Error(`Monitor ${monitorId} not found after disabling`);
      }
      writer.write(JSON.stringify(result, null, 2));
      return;
    }

    writer.success(`Monitor ${monitorId} disabled.`);
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exitCode = 1;
  }
}

export const disableCommand = defineCommand({
  experimental: true,
  loader: async () => disable,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        {
          placeholder: "monitorId",
          brief: "Monitor ID",
          parse: String,
        },
      ],
    },
    flags: {
      json: {
        kind: "boolean",
        brief: "Output the updated monitor as JSON",
        optional: true,
      },
    },
    aliases: {},
  },
  docs: {
    brief: "Disable a monitor",
  },
});
