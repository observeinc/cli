import { defineCommand } from "../../lib/stricli-wrappers";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { LocalContext } from "../../context";
import { updateMonitor } from "../../rest/monitor/update-monitor";
import { getMonitor } from "../../rest/monitor/get-monitor";
import {
  MonitorV2RuleKind,
  type MonitorV2ActionRule,
  type MonitorV2Definition,
  type MonitorV2PatchRequest,
} from "../../rest/generated";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import { parseMonitorId, parseJsonFile } from "../../lib/parsers";

interface UpdateMonitorFlags {
  file: string;
  json?: boolean;
}

export interface UpdateMonitorDeps {
  loadConfig?: typeof loadConfig;
  updateMonitor?: typeof updateMonitor;
  getMonitor?: typeof getMonitor;
  readFile?: (path: string) => string;
}

export async function update(
  this: LocalContext,
  flags: UpdateMonitorFlags,
  monitorId: string,
  deps: UpdateMonitorDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    updateMonitor: updateMonitorImpl = updateMonitor,
    getMonitor: getMonitorImpl = getMonitor,
    readFile: readFileImpl = (p) => readFileSync(p, "utf-8"),
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

    writer.info("Updating monitor...");

    const raw = readFileImpl(resolve(flags.file));
    const parsed = parseJsonFile<Record<string, unknown>>(raw, "--file");

    const { name, description, ruleKind, definition, actionRules, disabled } =
      parsed as {
        name?: string;
        description?: string;
        ruleKind?: MonitorV2RuleKind;
        definition?: MonitorV2Definition;
        actionRules?: MonitorV2ActionRule[];
        disabled?: boolean;
      };

    const patch = Object.fromEntries(
      Object.entries({
        name,
        description,
        ruleKind,
        definition,
        actionRules,
        disabled,
      }).filter(([, v]) => v !== undefined),
    ) as MonitorV2PatchRequest;

    await updateMonitorImpl({ config, id, ...patch });

    if (flags.json) {
      const result = await getMonitorImpl({ config, id });
      if (!result) {
        throw new Error(`Monitor ${monitorId} not found after update`);
      }
      writer.write(JSON.stringify(result, null, 2));
      return;
    }

    writer.success(`Monitor ${monitorId} updated.`);
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exitCode = 1;
  }
}

export const updateCommand = defineCommand({
  experimental: true,
  loader: async () => update,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [{ brief: "Monitor ID", parse: String }],
    },
    flags: {
      file: {
        kind: "parsed",
        parse: String,
        brief:
          "Path to a full monitor JSON file (e.g. from `monitor view --json`)",
        optional: false,
      },
      json: {
        kind: "boolean",
        brief: "Output the updated monitor as JSON",
        optional: true,
      },
    },
    aliases: {},
  },
  docs: {
    brief: "Update a monitor",
    fullDescription: [
      "Update a monitor from a JSON file.",
      "",
      "Edit flow:",
      "  observe monitor view <id> --json > monitor.json",
      "  # edit monitor.json",
      "  observe monitor update <id> --file monitor.json",
      "",
      "Patchable fields: name, description, ruleKind, definition, actionRules, disabled.",
      "Read-only fields (id, effectiveScheduling) are ignored.",
    ].join("\n"),
  },
});
