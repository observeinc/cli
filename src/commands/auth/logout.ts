/**
 * Logout Command
 *
 * Removes stored credentials and revokes authentication token.
 */

import { defineCommand } from "../../lib/stricli-wrappers";
import type { LocalContext } from "../../context";
import { configExists, deleteConfig, loadConfig } from "../../lib/config";
import { deleteAuthtoken } from "../../gql/authtoken/delete-authtoken";

export interface LogoutDeps {
  configExists?: typeof configExists;
  loadConfig?: typeof loadConfig;
  deleteConfig?: typeof deleteConfig;
  deleteAuthtoken?: typeof deleteAuthtoken;
}

export async function run(
  this: LocalContext,
  _flags: Record<string, never>,
  deps: LogoutDeps = {},
) {
  const {
    configExists: configExistsImpl = configExists,
    loadConfig: loadConfigImpl = loadConfig,
    deleteConfig: deleteConfigImpl = deleteConfig,
    deleteAuthtoken: deleteAuthtokenImpl = deleteAuthtoken,
  } = deps;
  const { writer } = this;

  // Check if credentials exist
  if (!configExistsImpl()) {
    writer.info("No credentials stored. Already logged out.");
    return;
  }

  const config = loadConfigImpl();

  // Attempt to revoke token on server (best effort)
  if (config.tokenId) {
    writer.info("Revoking token...");
    try {
      await deleteAuthtokenImpl(config, { id: config.tokenId });
    } catch {
      // Best effort - continue with local logout even if revocation fails
    }
  }

  // Delete local credentials
  deleteConfigImpl();

  writer.success("Logged out successfully.");
}

export const logoutCommand = defineCommand({
  loader: async () => run,
  parameters: {
    flags: {},
  },
  docs: {
    brief: "Log out from Observe",
    fullDescription:
      "Removes stored credentials and revokes the authentication token. " +
      "After logout, you will need to run 'observe auth login' to authenticate again.",
  },
});
