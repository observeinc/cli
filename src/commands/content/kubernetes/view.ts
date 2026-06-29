import { defineCommand } from "../../../lib/stricli-wrappers";
import type { LocalContext } from "../../../context";
import { getKubernetesContent } from "../../../gql/content/view-kubernetes-content";
import { GqlApiError } from "../../../gql/gql-request";
import { loadConfig } from "../../../lib/config";

export interface ViewKubernetesContentDeps {
  loadConfig?: typeof loadConfig;
}

export async function view(
  this: LocalContext,
  deps: ViewKubernetesContentDeps = {},
): Promise<void> {
  const { loadConfig: loadConfigImpl = loadConfig } = deps;
  const { process, writer } = this;

  try {
    const config = loadConfigImpl();
    const result = await getKubernetesContent(config);

    if (!result) {
      writer.write(JSON.stringify(null));
      return;
    }

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

export const viewCommand = defineCommand({
  experimental: true,
  loader: async () => view,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
    flags: {},
  },
  docs: {
    brief: "View current Kubernetes content status",
  },
});
