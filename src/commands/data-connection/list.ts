import { defineCommand } from "../../lib/stricli-wrappers";
import type { LocalContext } from "../../context.js";
import { searchConnections } from "../../gql/connection/search-connections.js";
import { GqlApiError } from "../../gql/gql-request.js";
import { loadConfig } from "../../lib/config.js";

interface ListConnectionsFlags {
  match?: string;
  moduleId?: string;
}

export interface ListConnectionsDeps {
  loadConfig?: typeof loadConfig;
}

export async function list(
  this: LocalContext,
  flags: ListConnectionsFlags,
  deps: ListConnectionsDeps = {},
): Promise<void> {
  const { loadConfig: loadConfigImpl = loadConfig } = deps;
  const { process, writer } = this;

  try {
    const config = loadConfigImpl();
    const results = await searchConnections(config, {
      nameSubstring: flags.match,
      moduleId: flags.moduleId,
    });
    writer.write(JSON.stringify(results, null, 2));
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

export const listCommand = defineCommand({
  experimental: true,
  loader: async () => list,
  parameters: {
    positional: { kind: "tuple", parameters: [] },
    flags: {
      match: {
        kind: "parsed",
        parse: String,
        brief: "Filter connections by name substring",
        optional: true,
      },
      moduleId: {
        kind: "parsed",
        parse: String,
        brief: "Filter connections by module ID",
        optional: true,
      },
    },
    aliases: {
      m: "match",
    },
  },
  docs: {
    brief: "List data connections",
  },
});
