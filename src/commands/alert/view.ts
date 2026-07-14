import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { getAlert } from "../../rest/alert/get-alert";
import {
  type AlertResource,
  type AlertLevel,
  AlertLevel as AlertLevelEnum,
  AlertStatus,
} from "../../rest/generated";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import { renderObject } from "../../lib/formatters/object";
import { renderAsCSV } from "../../lib/formatters/csv";

type OutputFormat = "json" | "csv";

interface ViewAlertFlags {
  format?: OutputFormat;
  json?: boolean;
}

function levelColor(level: AlertLevel): string {
  switch (level) {
    case AlertLevelEnum.Critical:
      return chalk.red(level);
    case AlertLevelEnum.Error:
      return chalk.redBright(level);
    case AlertLevelEnum.Warning:
      return chalk.yellow(level);
    case AlertLevelEnum.Informational:
      return chalk.blue(level);
    default:
      return chalk.dim(level);
  }
}

function columnName(col: {
  columnPath?: { name?: string } | null;
  linkColumn?: { name?: string } | null;
}) {
  return col.columnPath?.name ?? col.linkColumn?.name ?? "?";
}

function buildViewData(alert: AlertResource) {
  return {
    id: alert.id,
    level: alert.level,
    status: alert.status,
    muted: alert.muted,
    start: alert.start,
    end: alert.end ?? "-",
    detectedStart: alert.detectedStart ?? "-",
    detectedEnd: alert.detectedEnd ?? "-",
    monitorVersion: alert.monitorVersion,
    monitor: {
      id: alert.monitor.id,
      name: alert.monitor.record?.label ?? "-",
      description: alert.monitor.record?.description ?? "-",
    },
    context: alert.context.map((c) => ({
      column: columnName(c.column),
      value: c.value,
    })),
    capturedValues: alert.capturedValues.map((cv) => ({
      column: columnName(cv.column),
      value: cv.value ?? "-",
      types: cv.types.join(", "),
    })),
    stats: alert.stats
      ? {
          numNotifsSent: alert.stats.numNotifsSent,
          numNotifsMuted: alert.stats.numNotifsMuted,
          numNotifsDiscarded: alert.stats.numNotifsDiscarded,
          numErrors: alert.stats.numErrors,
          lastSentAt: alert.stats.lastSentAt ?? "-",
          lastMutedAt: alert.stats.lastMutedAt ?? "-",
          lastErroredAt: alert.stats.lastErroredAt ?? "-",
        }
      : undefined,
  };
}

export interface ViewAlertDeps {
  loadConfig?: typeof loadConfig;
}

export async function view(
  this: LocalContext,
  flags: ViewAlertFlags,
  alertId: string,
  deps: ViewAlertDeps = {},
): Promise<void> {
  const { loadConfig: loadConfigImpl = loadConfig } = deps;
  const format = flags.json ? ("json" as const) : flags.format;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  try {
    const config = loadConfigImpl();

    writer.info("Fetching alert...");

    const alert = await getAlert({ config, alertId });

    if (!alert) {
      writer.error(`Alert not found: ${alertId}`);
      process.exit(1);
      return;
    }

    if (format === "json") {
      writer.write(JSON.stringify(alert, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(alert));
      return;
    }

    writer.write("");
    writer.write(chalk.bold.white(`Alert ${alert.id}`));
    writer.write(
      levelColor(alert.level) +
        " " +
        (alert.status === AlertStatus.Active
          ? chalk.green("ACTIVE")
          : chalk.dim("ENDED")),
    );

    const viewData = buildViewData(alert);

    renderObject(viewData, (text) => writer.write(text));
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exit(1);
  }
}

export const viewCommand = defineCommand({
  loader: async () => view,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        {
          brief: "Alert ID",
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
    brief: "View details of an alert",
  },
});
