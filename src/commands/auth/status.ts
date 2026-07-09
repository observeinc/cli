import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import {
  configExists,
  getApiBaseUrl,
  getConfigPath,
  loadConfig,
} from "../../lib/config";
import { getDefaultWorkspace } from "../../gql/workspace/get-default-workspace";
import { GqlApiError } from "../../gql/gql-request";

async function status(
  this: LocalContext,
  flags: { json?: boolean },
): Promise<void> {
  const { process, writer } = this;

  if (!configExists()) {
    if (flags.json) {
      writer.write(JSON.stringify({ authenticated: false }, null, 2));
    } else {
      writer.error(
        "Not authenticated. Run 'observe auth login' to authenticate.",
      );
    }
    process.exitCode = 1;
    return;
  }

  const config = loadConfig();
  const baseUrl = getApiBaseUrl(config);
  const maskedToken =
    config.token.length > 8
      ? config.token.slice(0, 4) + "…" + config.token.slice(-4)
      : "****";

  let valid = false;
  let workspaceName: string | null = null;
  let workspaceId: string | null = null;
  let errorMessage: string | null = null;

  try {
    const { workspace } = await getDefaultWorkspace(config);
    valid = true;
    workspaceName = workspace?.label ?? null;
    workspaceId = workspace?.id ?? null;
  } catch (error) {
    if (error instanceof GqlApiError) {
      errorMessage = `${error.statusCode}: ${error.message}`;
    } else {
      errorMessage = error instanceof Error ? error.message : String(error);
    }
  }

  if (flags.json) {
    const result = {
      authenticated: true,
      valid,
      customerId: config.customerId,
      domain: config.domain,
      apiUrl: baseUrl,
      configPath: getConfigPath(),
      ...(config.tokenId && { tokenId: config.tokenId }),
      ...(workspaceName && { workspace: workspaceName }),
      ...(workspaceId && { workspaceId }),
      ...((workspaceName ?? workspaceId) && {
        _workspaceDeprecationNotice:
          "workspace and workspaceId fields are deprecated and will be removed in a future release",
      }),
      ...(errorMessage && { error: errorMessage }),
    };
    writer.write(JSON.stringify(result, null, 2));
    return;
  }

  if (valid) {
    writer.success("Authenticated\n");
  } else {
    writer.error("Authentication invalid\n");
  }

  writer.write(chalk.dim("  Customer ID   ") + config.customerId);
  writer.write(chalk.dim("  Domain        ") + config.domain);
  writer.write(chalk.dim("  API URL       ") + baseUrl);
  writer.write(chalk.dim("  Token         ") + maskedToken);
  if (config.tokenId) {
    writer.write(chalk.dim("  Token ID      ") + config.tokenId);
  }
  if (workspaceName) {
    writer.write(
      chalk.dim("  Workspace     ") +
        workspaceName +
        chalk.yellow(" (deprecated)"),
    );
  }
  if (workspaceId) {
    writer.write(
      chalk.dim("  Workspace ID  ") +
        workspaceId +
        chalk.yellow(" (deprecated)"),
    );
  }
  writer.write(chalk.dim("  Config        ") + getConfigPath());

  if (errorMessage) {
    writer.write("\n" + chalk.red("  Error: ") + errorMessage);
  }

  if (!valid) {
    process.exitCode = 1;
  }
}

export const statusCommand = defineCommand({
  loader: async () => status,
  parameters: {
    flags: {
      json: {
        kind: "boolean",
        brief: "Output as JSON",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Show authentication status",
    fullDescription:
      "Displays the current authentication status, including customer ID,\n" +
      "domain, and whether the token is valid. Validates the token by\n" +
      "making a lightweight API call.\n\n" +
      "Examples:\n" +
      "  observe auth status          # Show auth status\n" +
      "  observe auth status --json   # Machine-readable output",
  },
});
