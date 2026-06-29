import { buildCommand } from "@stricli/core";
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
  name?: string;
  description?: string;
  kind?: MonitorV2RuleKind;
  definition?: string;
  definitionFile?: string;
  actionRulesFile?: string;
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
    process.exit(1);
    return;
  }

  if (flags.definition != null && flags.definitionFile != null) {
    writer.error("--definition and --definition-file are mutually exclusive.");
    process.exit(1);
    return;
  }

  const hasUpdate =
    flags.name != null ||
    flags.description != null ||
    flags.kind != null ||
    flags.definition != null ||
    flags.definitionFile != null ||
    flags.actionRulesFile != null;

  if (!hasUpdate) {
    writer.error(
      "At least one update flag is required (--name, --description, --kind, --definition, --definition-file, --action-rules-file).",
    );
    process.exit(1);
    return;
  }

  try {
    const config = loadConfigImpl();

    writer.info("Updating monitor...");

    const patch: MonitorV2PatchRequest = {};
    if (flags.name != null) patch.name = flags.name;
    if (flags.description != null) patch.description = flags.description;
    if (flags.kind != null) patch.ruleKind = flags.kind;
    const rawDefinition =
      flags.definition ??
      (flags.definitionFile
        ? readFileImpl(resolve(flags.definitionFile))
        : null);
    if (rawDefinition != null) {
      patch.definition = parseJsonFile<MonitorV2Definition>(
        rawDefinition,
        "--definition / --definition-file",
      );
    }
    if (flags.actionRulesFile != null) {
      patch.actionRules = parseJsonFile<MonitorV2ActionRule[]>(
        readFileImpl(resolve(flags.actionRulesFile)),
        "--action-rules-file",
      );
    }

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
    process.exit(1);
  }
}

export const updateCommand = buildCommand({
  loader: async () => update,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [{ brief: "Monitor ID", parse: String }],
    },
    flags: {
      name: {
        kind: "parsed",
        parse: String,
        brief: "New monitor name",
        optional: true,
      },
      description: {
        kind: "parsed",
        parse: String,
        brief: "New monitor description",
        optional: true,
      },
      kind: {
        kind: "enum",
        values: [
          MonitorV2RuleKind.Count,
          MonitorV2RuleKind.Threshold,
          MonitorV2RuleKind.Promote,
        ],
        brief: "New alert rule kind (Count, Threshold, Promote)",
        optional: true,
      },
      definition: {
        kind: "parsed",
        parse: String,
        brief:
          "MonitorV2Definition as inline JSON (alternative to --definition-file)",
        optional: true,
      },
      definitionFile: {
        kind: "parsed",
        parse: String,
        brief: "Path to JSON file containing the new MonitorV2Definition",
        optional: true,
      },
      actionRulesFile: {
        kind: "parsed",
        parse: String,
        brief: "Path to JSON file containing new Array<MonitorV2ActionRule>",
        optional: true,
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
  },
});
