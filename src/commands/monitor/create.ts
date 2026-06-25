import { buildCommand } from "@stricli/core";
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
  name: string;
  ruleKind: MonitorV2RuleKind;
  definitionFile: string;
  actionRulesFile?: string;
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

    const definition = parseJsonFile<MonitorV2Definition>(
      readFileImpl(resolve(flags.definitionFile)),
      "--definition-file",
    );

    const actionRules = flags.actionRulesFile
      ? parseJsonFile<MonitorV2ActionRule[]>(
          readFileImpl(resolve(flags.actionRulesFile)),
          "--action-rules-file",
        )
      : undefined;

    const created = await createMonitorImpl({
      config,
      monitorV2: {
        name: flags.name,
        ruleKind: flags.ruleKind,
        definition,
        ...(actionRules != null && { actionRules }),
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
    process.exit(1);
  }
}

export const createCommand = buildCommand({
  loader: async () => create,
  parameters: {
    positional: { kind: "tuple", parameters: [] },
    flags: {
      name: {
        kind: "parsed",
        parse: String,
        brief: "Monitor name",
        optional: false,
      },
      ruleKind: {
        kind: "enum",
        values: [
          MonitorV2RuleKind.Count,
          MonitorV2RuleKind.Threshold,
          MonitorV2RuleKind.Promote,
        ],
        brief: "Alert rule kind (Count, Threshold, Promote)",
        optional: false,
      },
      definitionFile: {
        kind: "parsed",
        parse: String,
        brief: "Path to JSON file containing the MonitorV2Definition",
        optional: false,
      },
      actionRulesFile: {
        kind: "parsed",
        parse: String,
        brief: "Path to JSON file containing Array<MonitorV2ActionRule>",
        optional: true,
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
  },
});
