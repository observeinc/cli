import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { getMonitor } from "../../rest/monitor/get-monitor";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import { renderObject } from "../../lib/formatters/object";
import { renderAsCSV } from "../../lib/formatters/csv";
import { parseMonitorId } from "../../lib/parsers";
import { ruleKindColor } from "./monitor-utils";

type OutputFormat = "json" | "csv";

interface ViewMonitorFlags {
  format?: OutputFormat;
  json?: boolean;
}

export interface ViewMonitorDeps {
  loadConfig?: typeof loadConfig;
  getMonitor?: typeof getMonitor;
}

export async function view(
  this: LocalContext,
  flags: ViewMonitorFlags,
  monitorId: string,
  deps: ViewMonitorDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    getMonitor: getMonitorImpl = getMonitor,
  } = deps;
  const format = flags.json ? ("json" as const) : flags.format;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

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

    writer.info("Fetching monitor...");

    const monitor = await getMonitorImpl({ config, id });

    if (!monitor) {
      writer.error(`Monitor not found: ${monitorId}`);
      process.exitCode = 1;
      return;
    }

    if (format === "json") {
      writer.write(JSON.stringify(monitor, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(monitor));
      return;
    }

    writer.write("");
    writer.write(chalk.bold.white(`Monitor ${monitor.id}`));
    writer.write(
      ruleKindColor(monitor.ruleKind) +
        (monitor.disabled ? "  " + chalk.yellow("DISABLED") : ""),
    );

    const viewData = {
      id: monitor.id,
      name: monitor.name,
      disabled: monitor.disabled ?? false,
      ruleKind: monitor.ruleKind,
      actionRules: (monitor.actionRules ?? []).map((r) => ({
        actionId: r.actionId,
        inline: r.definition?.inline ?? false,
        type: r.definition?.type ?? "-",
      })),
      scheduling: monitor.effectiveScheduling
        ? {
            transform: monitor.effectiveScheduling.transform
              ? "transform-driven"
              : undefined,
            scheduled:
              monitor.effectiveScheduling.scheduled?.cronConfig ?? undefined,
          }
        : undefined,
    };

    renderObject(viewData, (text) => writer.write(text));

    writer.write("");
    writer.write(chalk.bold("Definition:"));
    writer.write(JSON.stringify(stripLayout(monitor.definition), null, 2));
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exitCode = 1;
  }
}

function stripLayout(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(stripLayout);
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>)
        .filter(([key]) => key !== "layout")
        .map(([key, val]) => [key, stripLayout(val)]),
    );
  }
  return obj;
}

export const viewCommand = defineCommand({
  experimental: true,
  loader: async () => view,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        {
          placeholder: "monitorId",
          brief: "Monitor ID",
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
    brief: "View details of a monitor",
  },
});
