import * as readline from "node:readline";
import { defineCommand } from "../../lib/stricli-wrappers";
import type { LocalContext } from "../../context";
import { deleteMonitor } from "../../rest/monitor/delete-monitor";
import { getMonitor } from "../../rest/monitor/get-monitor";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { parseMonitorId } from "../../lib/parsers";

interface DeleteMonitorFlags {
  yes?: boolean;
}

export interface DeleteMonitorDeps {
  loadConfig?: typeof loadConfig;
  deleteMonitor?: typeof deleteMonitor;
  getMonitor?: typeof getMonitor;
  confirmFn?: (monitorName: string) => Promise<boolean>;
}

function makeDefaultConfirm(proc: NodeJS.Process) {
  return (name: string): Promise<boolean> =>
    new Promise((resolve) => {
      const rl = readline.createInterface({
        input: proc.stdin,
        output: proc.stdout,
      });
      rl.question(
        `Are you sure you want to delete monitor "${name}"? This action is irreversible. [y/N]: `,
        (answer) => {
          rl.close();
          resolve(answer.trim().toLowerCase() === "y");
        },
      );
      rl.on("SIGINT", () => {
        rl.close();
        resolve(false);
      });
    });
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
    getMonitor: getMonitorImpl = getMonitor,
    confirmFn,
  } = deps;
  const { process, writer } = this;

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

    if (!flags.yes) {
      // When no confirmFn is injected (real usage), require a TTY.
      if (
        !confirmFn &&
        !(process.stdin as NodeJS.ReadStream | undefined)?.isTTY
      ) {
        writer.error(
          "Deleting a monitor is irreversible. Use --yes to confirm deletion in non-interactive mode.",
        );
        process.exitCode = 1;
        return;
      }

      const monitor = await getMonitorImpl({ config, id });
      if (!monitor) {
        writer.error(`Monitor not found: ${monitorId}`);
        process.exitCode = 1;
        return;
      }

      const confirm = confirmFn ?? makeDefaultConfirm(process);
      const confirmed = await confirm(monitor.name);
      if (!confirmed) {
        writer.error("Deletion cancelled.");
        process.exitCode = 1;
        return;
      }
    }

    writer.info("Deleting monitor...");

    await deleteMonitorImpl({ config, id });

    writer.success(`Monitor ${monitorId} deleted.`);
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exitCode = 1;
  }
}

export const deleteCommand = defineCommand({
  experimental: true,
  loader: async () => deleteMonitorCommand,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [{ brief: "Monitor ID", parse: String }],
    },
    flags: {
      yes: {
        kind: "boolean",
        brief: "Skip confirmation prompt (required in non-interactive mode)",
        optional: true,
      },
    },
    aliases: {},
  },
  docs: {
    brief: "Delete a monitor",
  },
});
