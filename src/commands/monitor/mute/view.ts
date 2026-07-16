import { buildCommand } from "@stricli/core";
import chalk from "chalk";
import type { LocalContext } from "../../../context";
import { getMonitorMute } from "../../../rest/monitor-mute/get-monitor-mute";
import {
  type MonitorMuteResource,
  MonitorMuteTargetKind,
} from "../../../rest/generated";
import { loadConfig } from "../../../lib/config";
import { formatApiError } from "../../../lib/format-error";
import { muteStatusWriter } from "../../../lib/writer";
import { renderObject } from "../../../lib/formatters/object";
import { renderAsCSV } from "../../../lib/formatters/csv";

type OutputFormat = "json" | "csv";

interface ViewMonitorMuteFlags {
  format?: OutputFormat;
  json?: boolean;
}

function buildViewData(mute: MonitorMuteResource) {
  return {
    id: mute.id,
    label: mute.label,
    description: mute.description ?? "-",
    target: {
      kind: mute.target.kind,
      monitors:
        mute.target.kind === MonitorMuteTargetKind.Monitors
          ? mute.target.monitors.map((m) => ({
              id: m.id,
              name: m.record?.label ?? "-",
            }))
          : [],
    },
    schedule: mute.schedule,
    filter: mute.filter ?? "-",
    start: mute.startTime ?? "-",
    end: mute.endTime ?? "open-ended",
    createdBy: mute.createdBy.label ?? mute.createdBy.id,
    createdAt: mute.createdAt,
    updatedBy: mute.updatedBy.label ?? mute.updatedBy.id,
    updatedAt: mute.updatedAt,
  };
}

export interface ViewMonitorMuteDeps {
  loadConfig?: typeof loadConfig;
}

export async function view(
  this: LocalContext,
  flags: ViewMonitorMuteFlags,
  id: string,
  deps: ViewMonitorMuteDeps = {},
): Promise<void> {
  const { loadConfig: loadConfigImpl = loadConfig } = deps;
  const format = flags.json ? ("json" as const) : flags.format;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  try {
    const config = loadConfigImpl();

    writer.info("Fetching monitor mute...");

    const mute = await getMonitorMute({ config, id });

    if (format === "json") {
      writer.write(JSON.stringify(mute, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(mute));
      return;
    }

    writer.write("");
    writer.write(chalk.bold.white(`Monitor mute ${mute.id}`));
    writer.write(
      mute.target.kind === MonitorMuteTargetKind.Global
        ? chalk.yellow("GLOBAL")
        : chalk.cyan(`MONITORS (${mute.target.monitors.length})`),
    );

    renderObject(buildViewData(mute), (text) => writer.write(text));
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exitCode = 1;
  }
}

export const viewCommand = buildCommand({
  loader: async () => view,
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
      format: {
        kind: "enum",
        values: ["json", "csv"],
        brief: "Output format (json, csv)",
        optional: true,
      },
      json: {
        kind: "boolean",
        brief: "Output as JSON (shorthand for --format=json)",
        optional: true,
      },
    },
    aliases: {},
  },
  docs: {
    brief: "View details of a monitor mute rule",
  },
});
