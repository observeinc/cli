import { defineCommand } from "../../lib/stricli-wrappers";
import type { LocalContext } from "../../context";
import { getIngestToken } from "../../rest/ingest-token/get-ingest-token";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";

export interface ViewIngestTokenDeps {
  loadConfig?: typeof loadConfig;
  getIngestToken?: typeof getIngestToken;
}

export async function view(
  this: LocalContext,
  _flags: Record<string, never>,
  id: string,
  deps: ViewIngestTokenDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    getIngestToken: getIngestTokenImpl = getIngestToken,
  } = deps;
  const { process, writer } = this;

  try {
    const config = loadConfigImpl();
    const result = await getIngestTokenImpl({ config, id });
    writer.write(JSON.stringify(result, null, 2));
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
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
          placeholder: "tokenId",
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
