import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { getDashboard } from "../../rest/dashboard/get-dashboard";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import { renderObject } from "../../lib/formatters/object";
import { renderAsCSV } from "../../lib/formatters/csv";

type OutputFormat = "json" | "csv";

interface ViewDashboardFlags {
  format?: OutputFormat;
  json?: boolean;
}

export interface ViewDashboardDeps {
  loadConfig?: typeof loadConfig;
  getDashboard?: typeof getDashboard;
}

export async function view(
  this: LocalContext,
  flags: ViewDashboardFlags,
  dashboardId: string,
  deps: ViewDashboardDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    getDashboard: getDashboardImpl = getDashboard,
  } = deps;
  const format = flags.json ? ("json" as const) : flags.format;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  try {
    const config = loadConfigImpl();

    writer.info("Fetching dashboard...");

    const dashboard = await getDashboardImpl({ config, id: dashboardId });

    if (!dashboard) {
      writer.error(`Dashboard not found: ${dashboardId}`);
      process.exitCode = 1;
      return;
    }

    // json/csv carry the whole document, including `definition`, so the
    // output round-trips into `dashboard update --file`.
    if (format === "json") {
      writer.write(JSON.stringify(dashboard, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(dashboard));
      return;
    }

    // The human-readable view shows envelope metadata only; `definition` is a
    // whole dashboard document and is not meaningful as key-value rows.
    const viewData = {
      id: dashboard.id,
      name: dashboard.name,
      description: dashboard.description ?? "-",
      visibility: dashboard.visibility,
      schemaVersion: dashboard.schemaVersion,
      createdAt: dashboard.createdAt,
      updatedAt: dashboard.updatedAt,
      createdBy: dashboard.createdBy.label ?? dashboard.createdBy.id,
      updatedBy: dashboard.updatedBy.label ?? dashboard.updatedBy.id,
      managedBy: dashboard.managedBy
        ? (dashboard.managedBy.record?.label ?? dashboard.managedBy.id)
        : "-",
      objectTags:
        Object.entries(dashboard.objectTags)
          .map(([key, values]) => `${key}=${(values ?? []).join(",")}`)
          .join("; ") || "-",
    };

    writer.write("");
    writer.write(chalk.bold.white(dashboard.name));
    if (dashboard.description) {
      writer.write(chalk.dim(dashboard.description));
    }

    renderObject(viewData, (text) => writer.write(text), {
      title: "Dashboard",
    });

    writer.info("Use --json to see the full dashboard definition.");
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exitCode = 1;
  }
}

export const viewCommand = defineCommand({
  experimental: true,
  loader: async () => view,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        {
          placeholder: "dashboardId",
          brief: "Dashboard ID",
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
    brief: "View a dashboard by ID",
    fullDescription: [
      "View a dashboard.",
      "",
      "The default output shows envelope metadata. Use --json to include the",
      "full `definition` document, which is the input format for",
      "'observe dashboard update'.",
    ].join("\n"),
  },
});
