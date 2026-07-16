import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { getDataset } from "../../rest/dataset/get-dataset";
import { ResponseError } from "../../rest/generated/runtime";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import { renderObject } from "../../lib/formatters/object";
import { renderAsCSV } from "../../lib/formatters/csv";

type OutputFormat = "json" | "csv";

interface ViewDatasetFlags {
  format?: OutputFormat;
  json?: boolean;
}

export interface ViewDatasetDeps {
  loadConfig?: typeof loadConfig;
}

export async function view(
  this: LocalContext,
  flags: ViewDatasetFlags,
  id: string,
  deps: ViewDatasetDeps = {},
): Promise<void> {
  const { loadConfig: loadConfigImpl = loadConfig } = deps;
  const format = flags.json ? ("json" as const) : flags.format;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  try {
    const config = loadConfigImpl();

    writer.info("Fetching dataset...");

    const dataset = await getDataset({ config, id });

    if (format === "json") {
      writer.write(JSON.stringify(dataset, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(dataset));
      return;
    }

    // TODO: Remove the optional chaining when the API is updated
    const viewData = {
      ...dataset,
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      fieldList: dataset.fieldList?.map((f) => ({
        name: f.name,
        type: f.type.tag,
      })),
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      primaryKey: dataset.primaryKey?.join(", "),
    };

    writer.write(chalk.bold.white(dataset.label));
    if (dataset.description) {
      writer.write(chalk.dim(dataset.description));
    }

    renderObject(viewData, (text) => writer.write(text));
  } catch (error) {
    if (error instanceof ResponseError && error.response.status === 404) {
      writer.error(`Dataset not found: ${id}`);
    } else {
      writer.error(`Error: ${await formatApiError(error)}`);
    }
    process.exitCode = 1;
  }
}

export const viewCommand = defineCommand({
  loader: async () => view,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        {
          placeholder: "datasetId",
          brief: "Dataset ID",
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
    brief: "View details of a dataset",
  },
});
