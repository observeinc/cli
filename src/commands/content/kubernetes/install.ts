import { defineCommand } from "../../../lib/stricli-wrappers";
import type { LocalContext } from "../../../context";
import { updateKubernetesContent } from "../../../gql/content/update-kubernetes-content";
import { GqlApiError } from "../../../gql/gql-request";
import { loadConfig } from "../../../lib/config";

interface InstallKubernetesContentFlags {
  otelLogsDatasetId?: string;
  prometheusDatasetId?: string;
  entityDatasetId?: string;
  rematerializationAction?: string;
}

export interface InstallKubernetesContentDeps {
  loadConfig?: typeof loadConfig;
}

export async function install(
  this: LocalContext,
  flags: InstallKubernetesContentFlags,
  deps: InstallKubernetesContentDeps = {},
): Promise<void> {
  const { loadConfig: loadConfigImpl = loadConfig } = deps;
  const { process, writer } = this;

  try {
    const config = loadConfigImpl();

    const result = await updateKubernetesContent(config, {
      input: {
        otelLogsDatasetId: flags.otelLogsDatasetId,
        prometheusDatasetId: flags.prometheusDatasetId,
        entityDatasetId: flags.entityDatasetId,
      },
      rematerializationAction: flags.rematerializationAction as
        | "AbortOnRematerialization"
        | "AbortOnContentRematerialization"
        | "IgnoreRematerialization"
        | undefined,
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
      otelLogsDatasetId: {
        kind: "parsed",
        parse: String,
        brief: "OTel Logs dataset ID for Kubernetes content",
        optional: true,
      },
      prometheusDatasetId: {
        kind: "parsed",
        parse: String,
        brief: "Prometheus dataset ID for Kubernetes content",
        optional: true,
      },
      entityDatasetId: {
        kind: "parsed",
        parse: String,
        brief: "Kubernetes Entity dataset ID for Kubernetes content",
        optional: true,
      },
      rematerializationAction: {
        kind: "parsed",
        parse: String,
        brief:
          "Action to take on rematerialization conflicts (AbortOnRematerialization, AbortOnContentRematerialization, IgnoreRematerialization)",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Install or update Kubernetes content",
    fullDescription:
      "Install or update Kubernetes Explorer content. This creates correlation tags,\n" +
      "RBAC rules, and derived datasets for Kubernetes observability.\n\n" +
      "Examples:\n" +
      "  observe content kubernetes install --otel-logs-dataset-id <id> --prometheus-dataset-id <id> --entity-dataset-id <id>",
  },
});
