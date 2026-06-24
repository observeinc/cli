import { buildCommand } from "@stricli/core";
import chalk from "chalk";
import type { LocalContext } from "../../../context";
import { updateMonitorMute } from "../../../rest/monitor-mute/update-monitor-mute";
import { type MonitorMuteUpdateRequest } from "../../../rest/generated";
import { loadConfig } from "../../../lib/config";
import { formatApiError } from "../../../lib/format-error";
import { muteStatusWriter } from "../../../lib/writer";
import { parseNonNegativeInt } from "../../../lib/parsers";
import { buildSchedule, buildTarget, parseMonitorIds } from "./parse";

interface UpdateMonitorMuteFlags {
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

export interface UpdateMonitorMuteDeps {
  loadConfig?: typeof loadConfig;
}

export async function update(
  this: LocalContext,
  flags: UpdateMonitorMuteFlags,
  id: string,
  deps: UpdateMonitorMuteDeps = {},
): Promise<void> {
  const { loadConfig: loadConfigImpl = loadConfig } = deps;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, { muted: flags.json });

  // JSON Merge Patch: only the fields provided as flags are sent.
  let body: MonitorMuteUpdateRequest;
  try {
    const target = buildTarget(flags);
    const schedule = buildSchedule(flags);
    body = {};
    if (flags.label !== undefined) {
      body.label = flags.label;
    }
    if (flags.description !== undefined) {
      body.description = flags.description;
    }
    if (target) {
      body.target = target;
    }
    if (schedule) {
      body.schedule = schedule;
    }
    if (flags.filter !== undefined) {
      body.filter = flags.filter;
    }
    if (Object.keys(body).length === 0) {
      throw new Error(
        "Nothing to update. Provide at least one of --label, --description, --monitors/--global, a schedule (--start/--end or --cron/--timezone/--duration), or --filter.",
      );
    }
  } catch (e) {
    writer.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
    return;
  }

  try {
    const config = loadConfigImpl();

    writer.info("Updating monitor mute...");

    const mute = await updateMonitorMute({ config, id, body });

    if (flags.json) {
      writer.write(JSON.stringify(mute, null, 2));
      return;
    }

    writer.write(
      chalk.green(`Updated monitor mute `) +
        chalk.bold(mute.id) +
        chalk.green(` — "${mute.label}"`),
    );
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exit(1);
  }
}

export const updateCommand = buildCommand({
  loader: async () => update,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        {
          brief: "Monitor mute rule ID",
          parse: String,
        },
      ],
    },
    flags: {
      label: {
        kind: "parsed",
        parse: String,
        brief: "New human-readable name",
        optional: true,
      },
      description: {
        kind: "parsed",
        parse: String,
        brief: "New description",
        optional: true,
      },
      monitors: {
        kind: "parsed",
        parse: parseMonitorIds,
        brief: "Replace the target with these comma-separated monitor IDs",
        optional: true,
      },
      global: {
        kind: "boolean",
        brief: "Replace the target with Global (all monitors)",
        optional: true,
      },
      filter: {
        kind: "parsed",
        parse: String,
        brief: "New CEL filter expression",
        optional: true,
      },
      start: {
        kind: "parsed",
        parse: String,
        brief: "New one-time window start (ISO-8601)",
        optional: true,
      },
      end: {
        kind: "parsed",
        parse: String,
        brief: "New one-time window end (ISO-8601)",
        optional: true,
      },
      cron: {
        kind: "parsed",
        parse: String,
        brief: "New recurring schedule cron expression",
        optional: true,
      },
      timezone: {
        kind: "parsed",
        parse: String,
        brief: "New recurring schedule IANA timezone",
        optional: true,
      },
      duration: {
        kind: "parsed",
        parse: parseNonNegativeInt,
        brief: "New recurring schedule duration per occurrence, in seconds",
        optional: true,
      },
      json: {
        kind: "boolean",
        brief: "Output the updated mute rule as JSON",
        optional: true,
      },
    },
    aliases: {},
  },
  docs: {
    brief: "Update a monitor mute rule",
    fullDescription: [
      "Update a monitor mute rule (snooze) by ID via the /v1/monitor-mutes REST API.",
      "",
      "Only the fields you pass as flags are changed (JSON Merge Patch). Provide a",
      "new target with --monitors/--global, or a new schedule with --start/--end",
      "or --cron/--timezone/--duration.",
      "",
      "Example:",
      "  observe monitor mute update mute-123 --label 'Snooze checkout (extended)'",
    ].join("\n"),
  },
});
