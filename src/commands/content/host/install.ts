import { defineCommand } from "../../../lib/stricli-wrappers";
import type { LocalContext } from "../../../context";
import { updateHostContent } from "../../../gql/content/update-host-content";
import { GqlApiError } from "../../../gql/gql-request";
import { loadConfig } from "../../../lib/config";

interface InstallHostContentFlags {
  otelLogsDatasetId?: string;
  prometheusDatasetId?: string;
}

export interface InstallHostContentDeps {
  loadConfig?: typeof loadConfig;
}

export async function install(
  this: LocalContext,
  flags: InstallHostContentFlags,
  deps: InstallHostContentDeps = {},
): Promise<void> {
  const { loadConfig: loadConfigImpl = loadConfig } = deps;
  const { process, writer } = this;

  try {
    const config = loadConfigImpl();
    const result = await updateHostContent(config, {
      input: {
        otelLogsDatasetId: flags.otelLogsDatasetId,
        prometheusDatasetId: flags.prometheusDatasetId,
      },
    });

    writer.write(JSON.stringify(result, null, 2));
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

export const installCommand = defineCommand({
  experimental: true,
  loader: async () => install,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
    flags: {
      otelLogsDatasetId: {
        kind: "parsed",
        parse: String,
        brief: "OTel Logs dataset ID for Host Explorer content",
        optional: true,
      },
      prometheusDatasetId: {
        kind: "parsed",
        parse: String,
        brief: "Prometheus dataset ID for Host Explorer content",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Install or update Host Explorer content",
    fullDescription: [
      "Install or update Host Explorer content. This creates the derived host logs",
      "content used by the Host Explorer UI.",
      "",
      "Examples:",
      "  observe content host install --otel-logs-dataset-id <id> --prometheus-dataset-id <id>",
    ].join("\n"),
  },
});
