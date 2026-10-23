import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { updateSourceDataset } from "../../rest/source-dataset/update-source-dataset";
import type { SourceDatasetUpdateRequest } from "../../rest/source-dataset/types";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import {
  buildUpdateBody,
  parseRetentionDays,
  parseTag,
  type UpdateFlags,
} from "./parse";

interface UpdateSourceDatasetFlags extends UpdateFlags {
  json?: boolean;
}

export interface UpdateSourceDatasetDeps {
  loadConfig?: typeof loadConfig;
  updateSourceDataset?: typeof updateSourceDataset;
}

export async function update(
  this: LocalContext,
  flags: UpdateSourceDatasetFlags,
  id: string,
  deps: UpdateSourceDatasetDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    updateSourceDataset: updateSD = updateSourceDataset,
  } = deps;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, { muted: flags.json === true });

  let body: SourceDatasetUpdateRequest;
  try {
    body = buildUpdateBody(flags);
  } catch (e) {
    writer.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
    return;
  }

  try {
    const config = loadConfigImpl();

    writer.info("Updating source dataset...");

    const dataset = await updateSD({ config, id, body });

    if (flags.json) {
      writer.write(JSON.stringify(dataset, null, 2));
      return;
    }

    writer.write(
      chalk.green("Updated source dataset ") +
        chalk.bold(dataset.id) +
        chalk.green(` — "${dataset.label}"`),
    );
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exitCode = 1;
  }
}

export const updateCommand = defineCommand({
  experimental: true,
  loader: async () => update,
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
      label: {
        kind: "parsed",
        parse: String,
        brief: "New package/name path (only the name part can change)",
        optional: true,
      },
      description: {
        kind: "parsed",
        parse: String,
        brief: "New description",
        optional: true,
      },
      clearDescription: {
        kind: "boolean",
        brief: "Remove the description",
        optional: true,
      },
      icon: {
        kind: "parsed",
        parse: String,
        brief: "New icon identifier",
        optional: true,
      },
      clearIcon: {
        kind: "boolean",
        brief: "Remove the icon",
        optional: true,
      },
      tag: {
        kind: "parsed",
        parse: parseTag,
        brief:
          "Replace all tags with these key=value tags (repeat for multiple)",
        optional: true,
        variadic: true,
      },
      clearTags: {
        kind: "boolean",
        brief: "Remove all tags",
        optional: true,
      },
      retentionDays: {
        kind: "parsed",
        parse: parseRetentionDays,
        brief: "New retention override in days (requires a workspace admin)",
        optional: true,
      },
      clearRetention: {
        kind: "boolean",
        brief: "Remove the retention override (requires a workspace admin)",
        optional: true,
      },
      json: {
        kind: "boolean",
        brief: "Output the updated source dataset as JSON",
        optional: true,
      },
    },
    aliases: {},
  },
  docs: {
    brief: "Update a source dataset",
    fullDescription: [
      "Update a source dataset by ID via the /v1/source-datasets REST API.",
      "",
      "Only the fields you pass as flags are changed (JSON Merge Patch). Use the",
      "--clear-* flags to remove a value. Renaming with --label changes only the",
      "name: keep the package part and any type suffix (such as ' Metrics').",
      "",
      "Example:",
      "  observe source-dataset update 41000001 --label Logs/checkout-v2",
    ].join("\n"),
  },
});
