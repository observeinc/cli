import { defineCommand } from "../../lib/stricli-wrappers";
import type { LocalContext } from "../../context";
import { createDatastream } from "../../gql/datastream/create-datastream";
import { GqlApiError } from "../../gql/gql-request";
import { loadConfig } from "../../lib/config";

interface CreateDatastreamFlags {
  name: string;
  description?: string;
  directWritePrometheus?: boolean;
  directWriteOtelLogs?: boolean;
  directWriteOtelMetrics?: boolean;
  directWriteK8sEntity?: boolean;
  directWriteOtelTrace?: boolean;
}

export interface CreateDatastreamDeps {
  loadConfig?: typeof loadConfig;
}

export async function create(
  this: LocalContext,
  flags: CreateDatastreamFlags,
  deps: CreateDatastreamDeps = {},
): Promise<void> {
  const { loadConfig: loadConfigImpl = loadConfig } = deps;
  const { process, writer } = this;

  try {
    const config = loadConfigImpl();

    const hasDirectWrite =
      flags.directWritePrometheus ??
      flags.directWriteOtelLogs ??
      flags.directWriteOtelMetrics ??
      flags.directWriteK8sEntity ??
      flags.directWriteOtelTrace;

    const result = await createDatastream(config, {
      datastream: {
        name: flags.name,
        description: flags.description,
        ...(hasDirectWrite && {
          directWrite: {
            prometheus: flags.directWritePrometheus ?? false,
            otelLogs: flags.directWriteOtelLogs ?? false,
            otelMetrics: flags.directWriteOtelMetrics ?? false,
            k8sEntity: flags.directWriteK8sEntity ?? false,
            otelTrace: flags.directWriteOtelTrace ?? false,
          },
        }),
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
    process.exitCode = 1;
  }
}

export const createCommand = defineCommand({
  loader: async () => create,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
    flags: {
      name: {
        kind: "parsed",
        parse: String,
        brief: "Name of the datastream",
        optional: false,
      },
      description: {
        kind: "parsed",
        parse: String,
        brief: "Description of the datastream",
        optional: true,
      },
      directWritePrometheus: {
        kind: "boolean",
        brief: "Enable Direct Write for Prometheus metrics",
        optional: true,
      },
      directWriteOtelLogs: {
        kind: "boolean",
        brief: "Enable Direct Write for OpenTelemetry logs",
        optional: true,
      },
      directWriteOtelMetrics: {
        kind: "boolean",
        brief: "Enable Direct Write for OpenTelemetry metrics",
        optional: true,
      },
      directWriteK8sEntity: {
        kind: "boolean",
        brief: "Enable Direct Write for Kubernetes entity data",
        optional: true,
      },
      directWriteOtelTrace: {
        kind: "boolean",
        brief: "Enable Direct Write for OpenTelemetry traces",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Create a datastream",
    fullDescription:
      "Create a new datastream with optional Direct Write configuration.\n\n" +
      "Examples:\n" +
      '  observe datastream create --name "Kubernetes Explorer/OpenTelemetry Logs" --direct-write-otel-logs\n' +
      '  observe datastream create --name "Kubernetes Explorer/Prometheus" --direct-write-prometheus\n' +
      '  observe datastream create --name "Tracing/Span" --direct-write-otel-trace',
  },
});
