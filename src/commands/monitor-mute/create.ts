import { buildCommand } from "@stricli/core";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { createMonitorMute } from "../../rest/monitor-mute/create-monitor-mute";
import { type MonitorMuteCreateRequest } from "../../rest/generated";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import { loadJsonInput } from "../../lib/json-input";

interface CreateMonitorMuteFlags {
  data?: string;
  file?: string;
  json?: boolean;
}

const BODY_EXAMPLE = `Example body:
{
  "label": "Snooze checkout during deploy",
  "target": { "kind": "Monitors", "monitors": [{ "id": "41000001" }] },
  "schedule": { "kind": "OneTime", "oneTime": { "startTime": "2026-06-23T18:00:00Z", "endTime": "2026-06-23T20:00:00Z" } }
}`;

async function create(
  this: LocalContext,
  flags: CreateMonitorMuteFlags,
): Promise<void> {
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, { muted: flags.json });

  let body: MonitorMuteCreateRequest;
  try {
    body = loadJsonInput(flags.data, flags.file) as MonitorMuteCreateRequest;
  } catch (e) {
    writer.error(e instanceof Error ? e.message : String(e));
    writer.info(`\n${BODY_EXAMPLE}`);
    process.exit(1);
    return;
  }

  try {
    const config = loadConfig();

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
      data: {
        kind: "parsed",
        parse: String,
        brief: "Mute rule body as an inline JSON string",
        optional: true,
      },
      file: {
        kind: "parsed",
        parse: String,
        brief: "Path to a JSON file containing the mute rule body",
        optional: true,
      },
      json: {
        kind: "boolean",
        brief: "Output the created mute rule as JSON",
        optional: true,
      },
    },
    aliases: {
      d: "data",
      f: "file",
    },
  },
  docs: {
    brief: "Create a monitor mute rule",
    fullDescription: [
      "Create a monitor mute rule (snooze) via the /v1/monitor-mutes REST API.",
      "",
      "Provide the request body with --data '<json>' or --file <path>.",
      "",
      BODY_EXAMPLE,
    ].join("\n"),
  },
});
