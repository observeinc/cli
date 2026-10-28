import { defineCommand } from "../../lib/stricli-wrappers";
import type { LocalContext } from "../../context";
import { listIngestTokens } from "../../rest/ingest-token/list-ingest-tokens";
import { loadConfig } from "../../lib/config";
import { celMatchesInsensitive } from "../../lib/cel";
import { formatApiError } from "../../lib/format-error";

interface ListIngestTokenFlags {
  match?: string;
}

export interface ListIngestTokenDeps {
  loadConfig?: typeof loadConfig;
  listIngestTokens?: typeof listIngestTokens;
}

const PAGE_SIZE = 100;

export async function list(
  this: LocalContext,
  flags: ListIngestTokenFlags,
  deps: ListIngestTokenDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    listIngestTokens: listIngestTokensImpl = listIngestTokens,
  } = deps;
  const { process, writer } = this;

  try {
    const config = loadConfigImpl();
    const tokens = [];
    for (;;) {
      const response = await listIngestTokensImpl({
        config,
        filter: flags.match
          ? celMatchesInsensitive("name", flags.match)
          : undefined,
        offset: tokens.length,
        limit: PAGE_SIZE,
      });
      tokens.push(...response.tokens);
      if (
        response.tokens.length === 0 ||
        (response.meta.totalCount >= 0 &&
          tokens.length >= response.meta.totalCount)
      ) {
        break;
      }
    }
    writer.write(JSON.stringify(tokens, null, 2));
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exitCode = 1;
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
