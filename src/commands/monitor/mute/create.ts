import { buildCommand } from "@stricli/core";
import chalk from "chalk";
import type { LocalContext } from "../../../context";
import { createMonitorMute } from "../../../rest/monitor-mute/create-monitor-mute";
import {
  MonitorMuteTargetKind,
  type MonitorMuteCreateRequest,
} from "../../../rest/generated";
import { loadConfig } from "../../../lib/config";
import { formatApiError } from "../../../lib/format-error";
import { muteStatusWriter } from "../../../lib/writer";
import { parseNonNegativeInt } from "../../../lib/parsers";
import { buildSchedule, buildTarget, parseMonitorIds } from "./parse";

interface CreateMonitorMuteFlags {
  label?: string;
  description?: string;
  monitors?: string[];
  global?: boolean;
  filter?: string;
  start?: string;
  end?: string;
  cron?: string;
  timezone?: string;
  duration?: number;
  json?: boolean;
}

export interface CreateMonitorMuteDeps {
  loadConfig?: typeof loadConfig;
}

export async function create(
  this: LocalContext,
  flags: CreateMonitorMuteFlags,
  deps: CreateMonitorMuteDeps = {},
): Promise<void> {
  const { loadConfig: loadConfigImpl = loadConfig } = deps;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, { muted: flags.json });

  let body: MonitorMuteCreateRequest;
  try {
    if (!flags.label) {
      throw new Error("--label is required.");
    }
    const target = buildTarget(flags);
    if (!target) {
      throw new Error(
        "Specify a target: --monitors <id,id> for specific monitors, or --global for all monitors.",
      );
    }
    const schedule = buildSchedule(flags);
    if (!schedule) {
      throw new Error(
        "Specify a schedule: --start <iso> [--end <iso>] for a one-time window, or --cron/--timezone/--duration for a recurring one.",
      );
    }
    if (target.kind === MonitorMuteTargetKind.Global && !flags.filter) {
      throw new Error("--filter is required when muting --global.");
    }
    body = {
      label: flags.label,
      description: flags.description,
      target,
      schedule,
      filter: flags.filter,
    };
  } catch (e) {
    writer.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
    return;
  }

  try {
    const config = loadConfigImpl();

    writer.info("Creating monitor mute...");

    const mute = await createMonitorMute({ config, body });

    if (flags.json) {
      writer.write(JSON.stringify(mute, null, 2));
      return;
    }

    writer.write(
      chalk.green(`Created monitor mute `) +
        chalk.bold(mute.id) +
        chalk.green(` — "${mute.label}"`),
    );
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exit(1);
  }
}

export const createCommand = buildCommand({
  loader: async () => create,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
    flags: {
      label: {
        kind: "parsed",
        parse: String,
        brief: "Human-readable name for the mute rule",
        optional: true,
      },
      description: {
        kind: "parsed",
        parse: String,
        brief: "Optional free-form description",
        optional: true,
      },
      monitors: {
        kind: "parsed",
        parse: parseMonitorIds,
        brief: "Comma-separated monitor IDs to mute (target kind: Monitors)",
        optional: true,
      },
      global: {
        kind: "boolean",
        brief: "Mute all monitors (target kind: Global); requires --filter",
        optional: true,
      },
      filter: {
        kind: "parsed",
        parse: String,
        brief:
          'CEL expression evaluated per fired alarm; required with --global (e.g. level == "Critical")',
        optional: true,
      },
      start: {
        kind: "parsed",
        parse: String,
        brief: "One-time window start (ISO-8601, e.g. 2026-06-23T18:00:00Z)",
        optional: true,
      },
      end: {
        kind: "parsed",
        parse: String,
        brief: "One-time window end (ISO-8601); omit for open-ended",
        optional: true,
      },
      cron: {
        kind: "parsed",
        parse: String,
        brief: "Recurring schedule cron expression (e.g. '0 9 * * 1-5')",
        optional: true,
      },
      timezone: {
        kind: "parsed",
        parse: String,
        brief: "Recurring schedule IANA timezone (e.g. America/Los_Angeles)",
        optional: true,
      },
      duration: {
        kind: "parsed",
        parse: parseNonNegativeInt,
        brief: "Recurring schedule duration per occurrence, in seconds",
        optional: true,
      },
      json: {
        kind: "boolean",
        brief: "Output the created mute rule as JSON",
        optional: true,
      },
    },
    aliases: {},
  },
  docs: {
    brief: "Create a monitor mute rule",
    fullDescription: [
      "Create a monitor mute rule (snooze) via the /v1/monitor-mutes REST API.",
      "",
      "Target (one required):",
      "  --monitors <id,id>   mute specific monitors",
      "  --global             mute all monitors (requires --filter)",
      "",
      "Schedule (one required):",
      "  --start <iso> [--end <iso>]                        one-time window",
      "  --cron <expr> --timezone <tz> --duration <secs>    recurring",
      "",
      "Example:",
      "  observe monitor mute create --label 'Snooze checkout' \\",
      "    --monitors 41000001 --start 2026-06-23T18:00:00Z --end 2026-06-23T20:00:00Z",
    ].join("\n"),
  },
});
