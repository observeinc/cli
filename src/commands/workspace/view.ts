import { buildCommand } from "@stricli/core";
import type { LocalContext } from "../../context";
import { viewWorkspace } from "../../gql/workspace/view-workspace";
import { GqlApiError } from "../../gql/gql-request";
import { loadConfig } from "../../lib/config";

export interface ViewWorkspaceDeps {
  loadConfig?: typeof loadConfig;
  viewWorkspace?: typeof viewWorkspace;
}

export async function view(
  this: LocalContext,
  _flags: Record<string, never>,
  deps: ViewWorkspaceDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    viewWorkspace: viewWorkspaceImpl = viewWorkspace,
  } = deps;
  const { process, writer } = this;

  try {
    const config = loadConfigImpl();
    const workspace = await viewWorkspaceImpl(config);
    if (!workspace) {
      writer.error("No workspace found");
      process.exit(1);
      return;
    }
    writer.write(JSON.stringify(workspace, null, 2));
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
    positional: {
      kind: "tuple",
      parameters: [],
    },
    flags: {},
  },
  docs: {
    brief: "View the current workspace",
    fullDescription:
      "Displays the current workspace ID, name, timezone, locale, and creation date.\n\n" +
      "Examples:\n" +
      "  observe workspace view",
  },
});
