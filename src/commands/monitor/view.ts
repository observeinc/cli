import { buildCommand } from "@stricli/core";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { getMonitor } from "../../rest/monitor/get-monitor";
import { MonitorV2RuleKind } from "../../rest/generated";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import { renderObject } from "../../lib/formatters/object";
import { renderAsCSV } from "../../lib/formatters/csv";
import { parseMonitorId } from "../../lib/parsers";

type OutputFormat = "json" | "csv";

interface ViewMonitorFlags {
  format?: OutputFormat;
  json?: boolean;
}

function ruleKindColor(kind: MonitorV2RuleKind | undefined): string {
  if (!kind) return "-";
  switch (kind) {
    case MonitorV2RuleKind.Threshold:
      return chalk.cyan(kind);
    case MonitorV2RuleKind.Count:
      return chalk.blue(kind);
    case MonitorV2RuleKind.Promote:
      return chalk.magenta(kind);
    default:
      return chalk.dim(kind);
  }
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
    process.exit(1);
    return;
  }

  try {
    const config = loadConfigImpl();

    writer.info("Fetching monitor...");

    const monitor = await getMonitorImpl({ config, id });

    if (!monitor) {
      writer.error(`Monitor not found: ${monitorId}`);
      process.exit(1);
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
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exit(1);
  }
}

export const viewCommand = buildCommand({
  loader: async () => view,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        {
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
