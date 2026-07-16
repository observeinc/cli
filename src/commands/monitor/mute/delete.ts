import { buildCommand } from "@stricli/core";
import chalk from "chalk";
import { createInterface } from "node:readline/promises";
import type { LocalContext } from "../../../context";
import { getMonitorMute } from "../../../rest/monitor-mute/get-monitor-mute";
import { deleteMonitorMute } from "../../../rest/monitor-mute/delete-monitor-mute";
import { MonitorMuteTargetKind } from "../../../rest/generated";
import { loadConfig } from "../../../lib/config";
import { formatApiError } from "../../../lib/format-error";
import { muteStatusWriter } from "../../../lib/writer";

interface DeleteMonitorMuteFlags {
  yes?: boolean;
  json?: boolean;
}

async function confirm(this: LocalContext, question: string): Promise<boolean> {
  const { process } = this;
  if (!process.stdin.isTTY) {
    return false;
  }
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const answer = await rl.question(`${question} [y/N] `);
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

export interface DeleteMonitorMuteDeps {
  loadConfig?: typeof loadConfig;
}

export async function remove(
  this: LocalContext,
  flags: DeleteMonitorMuteFlags,
  id: string,
  deps: DeleteMonitorMuteDeps = {},
): Promise<void> {
  const { loadConfig: loadConfigImpl = loadConfig } = deps;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, { muted: flags.json });

  try {
    const config = loadConfigImpl();

    if (!flags.yes) {
      // Fetch first so we can warn when deleting a rule that mutes several
      // monitors — deleting it resumes notifications for ALL of them.
      const mute = await getMonitorMute({ config, id });
      const target =
        mute.target.kind === MonitorMuteTargetKind.Monitors
          ? `${mute.target.monitors.length} monitor(s)`
          : "ALL monitors (Global)";
      writer.warn(
        `Deleting mute rule ${chalk.bold(id)} ("${mute.label}") will resume notifications for ${target}.`,
      );
      const confirmed = await confirm.call(this, "Delete this mute rule?");
      if (!confirmed) {
        writer.info("Aborted. Re-run with --yes to skip this prompt.");
        process.exitCode = 1;
        return;
      }
    }

    await deleteMonitorMute({ config, id });

    if (flags.json) {
      writer.write(JSON.stringify({ success: true, id }, null, 2));
      return;
    }

    writer.write(chalk.green(`Deleted monitor mute ${chalk.bold(id)}.`));
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exitCode = 1;
  }
}

export const deleteCommand = buildCommand({
  loader: async () => remove,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        {
          placeholder: "muteId",
          brief: "Monitor mute rule ID",
          parse: String,
        },
      ],
    },
    flags: {
      yes: {
        kind: "boolean",
        brief: "Skip the confirmation prompt",
        optional: true,
      },
      json: {
        kind: "boolean",
        brief: "Output the result as JSON",
        optional: true,
      },
    },
    aliases: {
      y: "yes",
    },
  },
  docs: {
    brief: "Delete a monitor mute rule",
    fullDescription: [
      "Delete a monitor mute rule by ID via the /v1/monitor-mutes REST API.",
      "",
      "Deleting a rule that targets multiple monitors resumes notifications for",
      "all of them. To unmute a single monitor from a shared rule, update the",
      "rule's target instead with 'observe monitor-mute update <id>'.",
    ].join("\n"),
  },
});
