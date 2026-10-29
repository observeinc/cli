import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { getStorageIntegration } from "../../rest/storage-integration/get-storage-integration";
import { ResponseError } from "../../rest/generated/runtime";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import { renderObject } from "../../lib/formatters/object";
import { renderAsCSV } from "../../lib/formatters/csv";

type OutputFormat = "json" | "csv";

interface ViewStorageIntegrationFlags {
  expand?: boolean;
  format?: OutputFormat;
  json?: boolean;
}

export interface ViewStorageIntegrationDeps {
  loadConfig?: typeof loadConfig;
  getStorageIntegration?: typeof getStorageIntegration;
}

export async function view(
  this: LocalContext,
  flags: ViewStorageIntegrationFlags,
  id: string,
  deps: ViewStorageIntegrationDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    getStorageIntegration: getSI = getStorageIntegration,
  } = deps;
  const format = flags.json ? ("json" as const) : flags.format;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  try {
    const config = loadConfigImpl();

    writer.info("Fetching storage integration...");

    const integration = await getSI({ config, id, expand: flags.expand });

    if (format === "json") {
      writer.write(JSON.stringify(integration, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(integration));
      return;
    }

    const viewData = {
      id: integration.id,
      type: integration.type,
      storageProvider: integration.storageProvider,
      s3BaseUrl: integration.awsConfig?.s3BaseUrl,
      iamRoleArn: integration.awsConfig?.iamRoleArn,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
    };

    writer.write(chalk.bold.white(integration.name));
    renderObject(viewData, (text) => writer.write(text));
  } catch (error) {
    if (error instanceof ResponseError && error.response.status === 404) {
      writer.error(`Storage integration not found: ${id}`);
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
          placeholder: "storageIntegrationId",
          brief: "Storage integration ID",
          parse: String,
        },
      ],
    },
    flags: {
      expand: {
        kind: "boolean",
        brief: "Include user details on createdBy and updatedBy",
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
    brief: "View details of a storage integration",
  },
});
