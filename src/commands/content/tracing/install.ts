import { defineCommand } from "../../../lib/stricli-wrappers";
import type { LocalContext } from "../../../context";
import { installTracingContent } from "../../../gql/content/install-tracing-content";
import { GqlApiError } from "../../../gql/gql-request";
import { loadConfig } from "../../../lib/config";

interface InstallTracingContentFlags {
  spanRawDatasetId?: string;
  spanEventDatasetId?: string;
  spanLinkDatasetId?: string;
  otelMetricsDatasetId?: string;
}

export interface InstallTracingContentDeps {
  loadConfig?: typeof loadConfig;
}

export async function install(
  this: LocalContext,
  flags: InstallTracingContentFlags,
  deps: InstallTracingContentDeps = {},
): Promise<void> {
  const { loadConfig: loadConfigImpl = loadConfig } = deps;
  const { process, writer } = this;

  try {
    const config = loadConfigImpl();

    const hasInput =
      flags.spanRawDatasetId ??
      flags.spanEventDatasetId ??
      flags.spanLinkDatasetId ??
      flags.otelMetricsDatasetId;

    const result = await installTracingContent(config, {
      input: hasInput
        ? {
            spanRawDatasetId: flags.spanRawDatasetId ?? "",
            spanEventDatasetId: flags.spanEventDatasetId ?? "",
            spanLinkDatasetId: flags.spanLinkDatasetId ?? "",
            otelMetricsDatasetId: flags.otelMetricsDatasetId ?? "",
          }
        : undefined,
    });

    writer.write(JSON.stringify(result, null, 2));
  } catch (error) {
    if (error instanceof GqlApiError) {
      writer.error(`API Error (${error.statusCode}): ${error.message}`);
    } else {
      const message = error instanceof Error ? error.message : String(error);
      writer.error(`Error: ${message}`);
    }
    process.exitCode = 1;
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
      spanRawDatasetId: {
        kind: "parsed",
        parse: String,
        brief: "Span Raw dataset ID",
        optional: true,
      },
      spanEventDatasetId: {
        kind: "parsed",
        parse: String,
        brief: "Span Event dataset ID",
        optional: true,
      },
      spanLinkDatasetId: {
        kind: "parsed",
        parse: String,
        brief: "Span Link dataset ID",
        optional: true,
      },
      otelMetricsDatasetId: {
        kind: "parsed",
        parse: String,
        brief: "OTel Metrics dataset ID",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Install Trace Explorer content",
    fullDescription:
      "Install Trace Explorer content. If dataset IDs are provided, uses those\n" +
      "specific datasets; otherwise auto-discovers from existing datastreams.\n\n" +
      "Examples:\n" +
      "  observe content tracing install\n" +
      "  observe content tracing install --span-raw-dataset-id <id> --span-event-dataset-id <id> --span-link-dataset-id <id> --otel-metrics-dataset-id <id>",
  },
});
