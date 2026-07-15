import { defineCommand } from "../../lib/stricli-wrappers";
import type { LocalContext } from "../../context";
import { viewIngestToken } from "../../gql/ingest-token/view-ingest-token";
import { GqlApiError } from "../../gql/gql-request";
import { loadConfig } from "../../lib/config";

export interface ViewIngestTokenDeps {
  loadConfig?: typeof loadConfig;
}

export async function view(
  this: LocalContext,
  _flags: Record<string, never>,
  id: string,
  deps: ViewIngestTokenDeps = {},
): Promise<void> {
  const { loadConfig: loadConfigImpl = loadConfig } = deps;
  const { process, writer } = this;

  try {
    const config = loadConfigImpl();
    const result = await viewIngestToken(config, { id });
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
      parameters: [
        {
          brief: "Ingest token ID",
          parse: String,
        },
      ],
    },
    flags: {},
  },
  docs: {
    brief: "View an ingest token by ID",
  },
});
