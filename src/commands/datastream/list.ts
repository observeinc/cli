import { defineCommand } from "../../lib/stricli-wrappers";
import type { LocalContext } from "../../context";
import { listDatastreams } from "../../gql/datastream/list-datastreams";
import { GqlApiError } from "../../gql/gql-request";
import { loadConfig } from "../../lib/config";
import { filterByName } from "../../lib/filter";

interface ListDatastreamsFlags {
  match?: string;
}

export interface ListDatastreamsDeps {
  loadConfig?: typeof loadConfig;
}

export async function list(
  this: LocalContext,
  flags: ListDatastreamsFlags,
  deps: ListDatastreamsDeps = {},
): Promise<void> {
  const { loadConfig: loadConfigImpl = loadConfig } = deps;
  const { process, writer } = this;

  try {
    const config = loadConfigImpl();
    const result = await listDatastreams(config);
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
        brief: "Filter datastreams by name substring (case-insensitive)",
        optional: true,
      },
    },
  },
  docs: {
    brief: "List datastreams",
  },
});
