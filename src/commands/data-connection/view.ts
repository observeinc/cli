import { defineCommand } from "../../lib/stricli-wrappers";
import type { LocalContext } from "../../context.js";
import { getConnection } from "../../gql/connection/get-connection.js";
import { GqlApiError } from "../../gql/gql-request.js";
import { loadConfig } from "../../lib/config.js";

export interface ViewConnectionDeps {
  loadConfig?: typeof loadConfig;
}

export async function view(
  this: LocalContext,
  _flags: Record<string, never>,
  id: string,
  deps: ViewConnectionDeps = {},
): Promise<void> {
  const { loadConfig: loadConfigImpl = loadConfig } = deps;
  const { process, writer } = this;

  try {
    const config = loadConfigImpl();
    const connection = await getConnection(config, { id });
    writer.write(JSON.stringify(connection, null, 2));
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
          brief: "Data connection ID",
          parse: String,
        },
      ],
    },
    flags: {},
  },
  docs: {
    brief: "View a data connection by ID",
  },
});
