import { buildCommand } from "@stricli/core";
import {
  gateExperimental,
  withExperimentalBadge,
} from "../../../lib/experimental";
import type { LocalContext } from "../../../context";
import { getHostContent } from "../../../gql/content/view-host-content";
import { GqlApiError } from "../../../gql/gql-request";
import { loadConfig } from "../../../lib/config";

export interface ViewHostContentDeps {
  loadConfig?: typeof loadConfig;
}

export async function view(
  this: LocalContext,
  deps: ViewHostContentDeps = {},
): Promise<void> {
  const { loadConfig: loadConfigImpl = loadConfig } = deps;
  const { process, writer } = this;

  try {
    const config = loadConfigImpl();
    const result = await getHostContent(config);

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

// EXPERIMENTAL
export const viewCommand = buildCommand({
  loader: async () => gateExperimental(view),
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
    flags: {},
  },
  docs: {
    brief: withExperimentalBadge("View current Host Explorer content status"),
  },
});
