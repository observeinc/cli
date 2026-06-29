import { defineCommand } from "../../lib/stricli-wrappers";
import type { LocalContext } from "../../context";
import { configExists, getConfigPath, saveConfig } from "../../lib/config";

interface ConfigureCommandFlags {
  customerId: string;
  token: string;
  domain: string;
  apiUrl?: string;
}

async function configure(
  this: LocalContext,
  flags: ConfigureCommandFlags,
): Promise<void> {
  const { process, writer } = this;

  try {
    saveConfig({
      customerId: flags.customerId,
      token: flags.token,
      domain: flags.domain,
      apiUrl: flags.apiUrl,
    });

    const configPath = getConfigPath();
    const wasExisting = configExists();

    writer.success(
      `Configuration ${wasExisting ? "updated" : "saved"} successfully!`,
    );
    writer.info(`  Config file: ${configPath}`);
    writer.info(`  Customer ID: ${flags.customerId}`);
    if (flags.apiUrl) {
      writer.info(`  API URL: ${flags.apiUrl}`);
    }
    writer.info(`  Token: ${"*".repeat(8)}...${flags.token.slice(-4)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writer.error(`Failed to save configuration: ${message}`);
    process.exit(1);
  }
}

export const configureCommand = defineCommand({
  loader: async () => configure,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
    flags: {
      customerId: {
        kind: "parsed",
        parse: String,
        brief: "Your Observe customer ID",
        optional: false,
      },
      token: {
        kind: "parsed",
        parse: String,
        brief: "Your Observe API token",
        optional: false,
      },
      domain: {
        kind: "parsed",
        parse: String,
        brief: "Observe domain (e.g., observeinc.com)",
        optional: false,
      },
      apiUrl: {
        kind: "parsed",
        parse: String,
        brief:
          "Full API URL (e.g., https://123456789012.observeinc.com/v1/meta)",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Configure Observe CLI credentials",
    fullDescription:
      "Set up your Observe API credentials. Your customer ID and token will be stored locally for future API calls.",
  },
});
