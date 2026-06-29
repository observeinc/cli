import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { getMetric } from "../../gql/metric/get-metric";
import { GqlApiError } from "../../gql/gql-request";
import { loadConfig } from "../../lib/config";
import { muteStatusWriter } from "../../lib/writer";
import { renderObject } from "../../lib/formatters/object";
import { renderAsCSV } from "../../lib/formatters/csv";

type OutputFormat = "json" | "csv";

interface ViewMetricFlags {
  format?: OutputFormat;
  json?: boolean;
  dataset?: string;
}

async function view(
  this: LocalContext,
  flags: ViewMetricFlags,
  name: string,
): Promise<void> {
  const format = flags.json ? ("json" as const) : flags.format;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  try {
    const config = loadConfig();

    writer.info("Fetching metric...");

    const { match, dataset } = await getMetric(config, name, flags.dataset);

    if (!match) {
      writer.error(`Metric not found: ${name}`);
      process.exit(1);
      return;
    }

    const metric = match.metric;

    if (format === "json") {
      writer.write(JSON.stringify({ metric, dataset }, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV({ metric, dataset }));
      return;
    }

    // Build data object for rendering
    // Nested objects (heuristics) become their own sections
    // Arrays (tags) become tables
    const viewData = {
      ...metric,
      dataset: dataset
        ? {
            id: match.datasetId,
            name: dataset.name,
            kind: dataset.kind,
          }
        : undefined,
    };

    // Terminal output with automatic sections
    writer.write(chalk.bold.white(metric.name));
    if (metric.description) {
      writer.write(chalk.dim(metric.description));
    }

    renderObject(viewData, (text) => writer.write(text));
  } catch (error) {
    if (error instanceof GqlApiError) {
      writer.error(`API Error (${error.statusCode}): ${error.message}`);
    } else {
      const message = error instanceof Error ? error.message : String(error);
      writer.error(`Error: ${message}`);
    }
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
          brief: "Metric name (exact match)",
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
      dataset: {
        kind: "parsed",
        parse: String,
        brief: "Filter by dataset ID",
        optional: true,
      },
    },
    aliases: {
      d: "dataset",
    },
  },
  docs: {
    brief: "View details of a metric",
  },
});
