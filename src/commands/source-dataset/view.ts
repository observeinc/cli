import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { getSourceDataset } from "../../rest/source-dataset/get-source-dataset";
import { ResponseError } from "../../rest/generated/runtime";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import { renderObject } from "../../lib/formatters/object";
import { renderAsCSV } from "../../lib/formatters/csv";

type OutputFormat = "json" | "csv";

interface ViewSourceDatasetFlags {
  expand?: boolean;
  format?: OutputFormat;
  json?: boolean;
}

export interface ViewSourceDatasetDeps {
  loadConfig?: typeof loadConfig;
  getSourceDataset?: typeof getSourceDataset;
}

export async function view(
  this: LocalContext,
  flags: ViewSourceDatasetFlags,
  id: string,
  deps: ViewSourceDatasetDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    getSourceDataset: getSD = getSourceDataset,
  } = deps;
  const format = flags.json ? ("json" as const) : flags.format;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  try {
    const config = loadConfigImpl();

    writer.info("Fetching source dataset...");

    const dataset = await getSD({ config, id, expand: flags.expand });

    if (format === "json") {
      writer.write(JSON.stringify(dataset, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(dataset));
      return;
    }

    const ingest = dataset.dataSource.ingest;
    const viewData = {
      id: dataset.id,
      type: ingest?.schemaType,
      storage: ingest?.storage,
      ingestStatus: dataset.ingestStatus,
      icon: dataset.icon,
      objectTags: dataset.objectTags,
      dataRetentionDays: dataset.dataRetentionDays,
      effectiveDataRetentionDays: dataset.effectiveDataRetentionDays,
      fieldList: dataset.fieldList.map((f) => ({
        name: f.name,
        type: f.type.tag,
      })),
      ingestStats: dataset.ingestStats ?? undefined,
      createdAt: dataset.createdAt,
      updatedAt: dataset.updatedAt,
    };

    writer.write(chalk.bold.white(dataset.label));
    if (dataset.description) {
      writer.write(chalk.dim(dataset.description));
    }

    renderObject(viewData, (text) => writer.write(text));
  } catch (error) {
    if (error instanceof ResponseError && error.response.status === 404) {
      writer.error(`Source dataset not found: ${id}`);
    } else {
      writer.error(`Error: ${await formatApiError(error)}`);
    }
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
          placeholder: "sourceDatasetId",
          brief: "Source dataset ID",
          parse: String,
        },
      ],
    },
    flags: {
      expand: {
        kind: "boolean",
        brief: "Include ingest stats for the last hour",
        optional: true,
      },
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
    brief: "View details of a source dataset",
  },
});
