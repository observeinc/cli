/**
 * Logout Command
 *
 * Removes stored credentials and revokes authentication token.
 */

import { defineCommand } from "../../lib/stricli-wrappers";
import type { LocalContext } from "../../context";
import { configExists, deleteConfig, loadConfig } from "../../lib/config";
import { deleteAuthtoken } from "../../gql/authtoken/delete-authtoken";

async function run(this: LocalContext, _flags: Record<string, never>) {
  const { writer } = this;

  // Check if credentials exist
  if (!configExists()) {
    writer.info("No credentials stored. Already logged out.");
    return;
  }

  const config = loadConfig();

  // Attempt to revoke token on server (best effort)
  if (config.tokenId) {
    writer.info("Revoking token...");
    try {
      await deleteAuthtoken(config, { id: config.tokenId });
    } catch {
      // Best effort - continue with local logout even if revocation fails
    }
  }

  // Delete local credentials
  deleteConfig();

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
