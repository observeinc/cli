import { defineCommand } from "../../../lib/stricli-wrappers";
import type { LocalContext } from "../../../context";
import { getTracingContent } from "../../../gql/content/view-tracing-content";
import { GqlApiError } from "../../../gql/gql-request";
import { loadConfig } from "../../../lib/config";

export interface ViewTracingContentDeps {
  loadConfig?: typeof loadConfig;
}

export async function view(
  this: LocalContext,
  deps: ViewTracingContentDeps = {},
): Promise<void> {
  const { loadConfig: loadConfigImpl = loadConfig } = deps;
  const { process, writer } = this;

  try {
    const config = loadConfigImpl();
    const result = await getTracingContent(config);

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
    process.exitCode = 1;
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
    brief: "View current Trace Explorer content status",
  },
});
