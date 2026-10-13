import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { createSourceDataset } from "../../rest/source-dataset/create-source-dataset";
import type {
  SourceDatasetCreateRequest,
  SourceDatasetSchemaType,
  SourceDatasetStorage,
} from "../../rest/source-dataset/types";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import { buildObjectTags, parseRetentionDays, parseTag } from "./parse";

interface CreateSourceDatasetFlags {
  label: string;
  description?: string;
  icon?: string;
  tag?: [string, string][];
  retentionDays?: number;
  schemaType?: SourceDatasetSchemaType;
  storage?: SourceDatasetStorage;
  storageIntegrationId?: string;
  json?: boolean;
}

export function buildCreateBody(
  flags: CreateSourceDatasetFlags,
): SourceDatasetCreateRequest {
  if (flags.storageIntegrationId !== undefined && flags.storage !== "Iceberg") {
    throw new Error("--storage-integration-id requires --storage Iceberg");
  }
  if (flags.storage === "Iceberg" && flags.storageIntegrationId === undefined) {
    throw new Error("--storage Iceberg requires --storage-integration-id");
  }

  const body: SourceDatasetCreateRequest = { label: flags.label };
  if (flags.description !== undefined) body.description = flags.description;
  if (flags.icon !== undefined) body.icon = flags.icon;
  if (flags.tag !== undefined) body.objectTags = buildObjectTags(flags.tag);
  if (flags.retentionDays !== undefined) {
    body.dataRetentionDays = flags.retentionDays;
  }
  if (flags.schemaType !== undefined || flags.storage !== undefined) {
    body.dataSource = {
      kind: "Ingest",
      ingest: {
        storage: flags.storage,
        schemaType: flags.schemaType,
        iceberg:
          flags.storageIntegrationId !== undefined
            ? { storageIntegrationId: flags.storageIntegrationId }
            : undefined,
      },
    };
  }
  return body;
}

export interface CreateSourceDatasetDeps {
  loadConfig?: typeof loadConfig;
  createSourceDataset?: typeof createSourceDataset;
}

export async function create(
  this: LocalContext,
  flags: CreateSourceDatasetFlags,
  deps: CreateSourceDatasetDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    createSourceDataset: createSD = createSourceDataset,
  } = deps;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, { muted: flags.json === true });

  let body: SourceDatasetCreateRequest;
  try {
    body = buildCreateBody(flags);
  } catch (e) {
    writer.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
    return;
  }

  try {
    const config = loadConfigImpl();

    writer.info("Creating source dataset...");

    const dataset = await createSD({ config, body });

    if (flags.json) {
      writer.write(JSON.stringify(dataset, null, 2));
      return;
    }

    writer.write(
      chalk.green("Created source dataset ") +
        chalk.bold(dataset.id) +
        chalk.green(` — "${dataset.label}"`),
    );
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exitCode = 1;
  }
}

export const createCommand = defineCommand({
  experimental: true,
  loader: async () => create,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
    flags: {
      label: {
        kind: "parsed",
        parse: String,
        brief: "Name as a package/name path (e.g. Logs/checkout)",
      },
      description: {
        kind: "parsed",
        parse: String,
        brief: "Description",
        optional: true,
      },
      icon: {
        kind: "parsed",
        parse: String,
        brief: "Icon identifier",
        optional: true,
      },
      tag: {
        kind: "parsed",
        parse: parseTag,
        brief: "Tag as key=value (repeat for multiple)",
        optional: true,
        variadic: true,
      },
      retentionDays: {
        kind: "parsed",
        parse: parseRetentionDays,
        brief: "Retention override in days (requires a workspace admin)",
        optional: true,
      },
      schemaType: {
        kind: "enum",
        values: [
          "Any",
          "OtelLogs",
          "OtelMetrics",
          "Prometheus",
          "K8sEntity",
          "OtelSpan",
        ],
        brief: "Signal type to create (default Any, inferred from the data)",
        optional: true,
      },
      storage: {
        kind: "enum",
        values: ["Native", "Iceberg"],
        brief: "Where the data is stored (default Native)",
        optional: true,
      },
      storageIntegrationId: {
        kind: "parsed",
        parse: String,
        brief: "Storage integration ID (required with --storage Iceberg)",
        optional: true,
      },
      json: {
        kind: "boolean",
        brief: "Output the created source dataset as JSON",
        optional: true,
      },
    },
    aliases: {},
  },
  docs: {
    brief: "Create a source dataset",
    fullDescription: [
      "Create a source dataset via the /v1/source-datasets REST API.",
      "",
      "Signal type, storage and storage integration cannot be changed later.",
      "",
      "Example:",
      "  observe source-dataset create --label Logs/checkout --schema-type OtelLogs",
    ].join("\n"),
  },
});
