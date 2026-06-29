import { defineCommand } from "../../lib/stricli-wrappers";
import type { LocalContext } from "../../context";
import { searchIngestToken } from "../../gql/ingest-token/search-ingest-token";
import { GqlApiError } from "../../gql/gql-request";
import { loadConfig } from "../../lib/config";
import { filterByName } from "../../lib/filter";

interface ListIngestTokenFlags {
  match?: string;
}

export interface ListIngestTokenDeps {
  loadConfig?: typeof loadConfig;
}

export async function list(
  this: LocalContext,
  flags: ListIngestTokenFlags,
  deps: ListIngestTokenDeps = {},
): Promise<void> {
  const { loadConfig: loadConfigImpl = loadConfig } = deps;
  const { process, writer } = this;

  try {
    const config = loadConfigImpl();
    const result = await searchIngestToken(config);
    writer.write(JSON.stringify(filterByName(result, flags.match), null, 2));
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

export const listCommand = defineCommand({
  experimental: true,
  loader: async () => list,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
    flags: {
      match: {
        kind: "parsed",
        parse: String,
        brief: "Filter by name substring (case-insensitive)",
        optional: true,
      },
    },
  },
  docs: {
    brief: "List ingest tokens",
  },
});
