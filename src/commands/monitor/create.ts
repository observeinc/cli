import { defineCommand } from "../../lib/stricli-wrappers";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { LocalContext } from "../../context";
import { createMonitor } from "../../rest/monitor/create-monitor";
import { getMonitor } from "../../rest/monitor/get-monitor";
import {
  MonitorV2RuleKind,
  type MonitorV2ActionRule,
  type MonitorV2Definition,
} from "../../rest/generated";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import { parseMonitorId, parseJsonFile } from "../../lib/parsers";

interface CreateMonitorFlags {
  file: string;
  json?: boolean;
}

export interface CreateMonitorDeps {
  loadConfig?: typeof loadConfig;
  createMonitor?: typeof createMonitor;
  getMonitor?: typeof getMonitor;
  readFile?: (path: string) => string;
}

export async function create(
  this: LocalContext,
  flags: CreateMonitorFlags,
  deps: CreateMonitorDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    createMonitor: createMonitorImpl = createMonitor,
    getMonitor: getMonitorImpl = getMonitor,
    readFile: readFileImpl = (p) => readFileSync(p, "utf-8"),
  } = deps;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, { muted: flags.json === true });

  try {
    const config = loadConfigImpl();

    writer.info("Creating monitor...");

    const raw = readFileImpl(resolve(flags.file));
    const parsed = parseJsonFile<Record<string, unknown>>(raw, "--file");

    if (!parsed.name || typeof parsed.name !== "string") {
      writer.error('--file must contain a "name" field (string).');
      process.exitCode = 1;
      return;
    }
    if (!parsed.ruleKind) {
      writer.error(
        `--file must contain a "ruleKind" field (${Object.values(MonitorV2RuleKind).join(", ")}).`,
      );
      process.exitCode = 1;
      return;
    }
    if (!parsed.definition) {
      writer.error('--file must contain a "definition" field.');
      process.exitCode = 1;
      return;
    }

    const created = await createMonitorImpl({
      config,
      monitorV2: {
        name: parsed.name,
        ruleKind: parsed.ruleKind as MonitorV2RuleKind,
        definition: parsed.definition as MonitorV2Definition,
        ...(parsed.actionRules != null && {
          actionRules: parsed.actionRules as MonitorV2ActionRule[],
        }),
      },
    });

    let createdId: number;
    try {
      createdId = parseMonitorId(created.id);
    } catch {
      throw new Error(
        `Create API returned unexpected monitor ID: "${created.id}"`,
      );
    }

    if (flags.json) {
      const result = await getMonitorImpl({ config, id: createdId });
      if (!result) {
        throw new Error(`Monitor ${created.id} not found after creation`);
      }
      writer.write(JSON.stringify(result, null, 2));
      return;
    }

    writer.success(`Monitor ${created.id} created.`);
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exitCode = 1;
  }
}

export const createCommand = defineCommand({
  experimental: true,
  loader: async () => create,
  parameters: {
    positional: { kind: "tuple", parameters: [] },
    flags: {
      file: {
        kind: "parsed",
        parse: String,
        brief: "Path to JSON file containing the monitor to create",
        optional: false,
      },
      json: {
        kind: "boolean",
        brief: "Output the created monitor as JSON",
        optional: true,
      },
    },
    aliases: {},
  },
  docs: {
    brief: "Create a new monitor",
    fullDescription: [
      "Create a new MonitorV2 monitor from a JSON file.",
      "",
      "Required fields in the JSON file:",
      "  name       (string)  Monitor name",
      `  ruleKind   (${Object.values(MonitorV2RuleKind).join(" | ")})`,
      "  definition (object)  MonitorV2Definition",
      "",
      "Optional fields:",
      "  actionRules (array)  Array<MonitorV2ActionRule>",
      "",
      "Full schema reference: https://developer.observeinc.com/#model/monitorv2definition",
      "",
      "Minimal definition example:",
      '  {"inputQuery":{"outputStage":"main","stages":[{"stageID":"main","pipeline":"filter true"}]},"rules":[]}',
    ].join("\n"),
  },
});
