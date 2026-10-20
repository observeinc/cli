import { defineCommand } from "../../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../../context";
import { createRegistrationToken } from "../../../rest/share-in/create-registration-token";
import { loadConfig } from "../../../lib/config";
import { formatApiError } from "../../../lib/format-error";
import { muteStatusWriter } from "../../../lib/writer";
import { parseShareName, withShareName, writeSteps } from "../sql";

interface CreateTokenFlags {
  shareName: string;
  providerAccount: string;
  json?: boolean;
}

export interface CreateTokenDeps {
  loadConfig?: typeof loadConfig;
  createRegistrationToken?: typeof createRegistrationToken;
}

export async function create(
  this: LocalContext,
  flags: CreateTokenFlags,
  deps: CreateTokenDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    createRegistrationToken: createToken = createRegistrationToken,
  } = deps;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, { muted: flags.json === true });

  try {
    const config = loadConfigImpl();

    writer.info("Creating registration token...");

    const issued = await createToken({
      config,
      providerAccount: flags.providerAccount,
    });
    const setupSql = withShareName(issued.setupSql, flags.shareName);

    if (flags.json) {
      writer.write(JSON.stringify({ ...issued, setupSql }, null, 2));
      return;
    }

    writer.write(
      chalk.green("Created a registration token for ") +
        chalk.bold(flags.providerAccount) +
        chalk.green(` (expires ${issued.expiresAt}).`),
    );
    writer.write("");
    writer.write("Run this in your Snowflake provider account:");
    writeSteps((text) => writer.write(text), setupSql, {
      bold: chalk.bold,
      sql: chalk.cyan,
    });
    writer.write("");
    writer.write("Then register the share:");
    writer.write(
      chalk.cyan(
        `   observe share-in register --share-name ${flags.shareName} --provider-account ${flags.providerAccount}`,
      ),
    );
    writer.write("");
    writer.warn(
      "The token is shown only once. Creating another token for this provider account replaces it.",
    );
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exitCode = 1;
  }
}

export const createCommand = defineCommand({
  experimental: true,
  loader: async () => create,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
    flags: {
      shareName: {
        kind: "parsed",
        parse: parseShareName,
        brief: "Name of the Snowflake share you created for Observe",
      },
      providerAccount: {
        kind: "parsed",
        parse: String,
        brief: "Snowflake account that provides the share, as <ORG>.<ACCOUNT>",
      },
      json: {
        kind: "boolean",
        brief: "Output the token response as JSON",
        optional: true,
      },
    },
    aliases: {},
  },
  docs: {
    brief: "Create a single-use token that proves you own a share",
    fullDescription: [
      "Create a registration token for a provider account and print the",
      "ALTER SHARE statement that sets it as the share comment. Observe checks",
      "the comment when you run `observe share-in register`.",
      "",
      "The token is a secret and is shown only this once.",
      "",
      "Example:",
      "  observe share-in token create --share-name OBSERVE_SHARE --provider-account ACME.PROD",
    ].join("\n"),
  },
});
