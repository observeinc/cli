import { buildCommand } from "@stricli/core";
import type { LocalContext } from "../../context.js";
import { searchConnections } from "../../gql/connection/search-connections.js";
import { GqlApiError } from "../../gql/gql-request.js";
import { loadConfig } from "../../lib/config.js";

interface ViewConnectionFlags {
  name: string;
}

export interface ViewConnectionDeps {
  loadConfig?: typeof loadConfig;
}

export async function view(
  this: LocalContext,
  flags: ViewConnectionFlags,
  deps: ViewConnectionDeps = {},
): Promise<void> {
  const { loadConfig: loadConfigImpl = loadConfig } = deps;
  const { process, writer } = this;

  try {
    const config = loadConfigImpl();
    const results = await searchConnections(config, { nameExact: flags.name });
    if (results.length === 0) {
      writer.error(`No connection found with name: ${flags.name}`);
      process.exit(1);
      return;
    }
    writer.write(JSON.stringify(results[0], null, 2));
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

export const viewCommand = buildCommand({
  loader: async () => view,
  parameters: {
    positional: { kind: "tuple", parameters: [] },
    flags: {
      name: {
        kind: "parsed",
        parse: String,
        brief: "Exact connection name to view",
        optional: false,
      },
    },
  },
  docs: {
    brief: "View a data connection by name",
  },
});
