import { buildCommand } from "@stricli/core";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { updateMonitorMute } from "../../rest/monitor-mute/update-monitor-mute";
import { type MonitorMuteUpdateRequest } from "../../rest/generated";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import { loadJsonInput } from "../../lib/json-input";

interface UpdateMonitorMuteFlags {
  data?: string;
  file?: string;
  json?: boolean;
}

const BODY_EXAMPLE = `Only the fields you provide are changed (JSON Merge Patch).
Example body:
{
  "label": "Snooze checkout (extended)",
  "schedule": { "kind": "OneTime", "oneTime": { "startTime": "2026-06-23T18:00:00Z", "endTime": "2026-06-23T22:00:00Z" } }
}`;

async function update(
  this: LocalContext,
  flags: UpdateMonitorMuteFlags,
  id: string,
): Promise<void> {
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, { muted: flags.json });

  let body: MonitorMuteUpdateRequest;
  try {
    body = loadJsonInput(flags.data, flags.file) as MonitorMuteUpdateRequest;
  } catch (e) {
    writer.error(e instanceof Error ? e.message : String(e));
    writer.info(`\n${BODY_EXAMPLE}`);
    process.exit(1);
    return;
  }

  try {
    const config = loadConfig();

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
      data: {
        kind: "parsed",
        parse: String,
        brief: "Partial mute rule body as an inline JSON string",
        optional: true,
      },
      file: {
        kind: "parsed",
        parse: String,
        brief: "Path to a JSON file containing the partial mute rule body",
        optional: true,
      },
      json: {
        kind: "boolean",
        brief: "Output the updated mute rule as JSON",
        optional: true,
      },
    },
    aliases: {
      d: "data",
      f: "file",
    },
  },
  docs: {
    brief: "Update a monitor mute rule",
    fullDescription: [
      "Update a monitor mute rule (snooze) by ID via the /v1/monitor-mutes REST API.",
      "",
      "Provide the partial body with --data '<json>' or --file <path>.",
      "",
      BODY_EXAMPLE,
    ].join("\n"),
  },
});
