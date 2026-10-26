import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { registerShare } from "../../rest/inbound-share/register-share";
import { loadConfig } from "../../lib/config";
import { errorType, formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import { parseShareName } from "./sql";

interface RegisterFlags {
  shareName: string;
  providerAccount: string;
  json?: boolean;
}

export const OWNERSHIP_PROOF_HINT =
  "Check that the share comment is set to an unexpired token from `observe inbound-share token create` for this provider account, and that the share is granted to Observe's consumer account (see `observe inbound-share setup`).";

export interface RegisterDeps {
  loadConfig?: typeof loadConfig;
  registerShare?: typeof registerShare;
}

export async function register(
  this: LocalContext,
  flags: RegisterFlags,
  deps: RegisterDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    registerShare: registerImpl = registerShare,
  } = deps;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, { muted: flags.json === true });

  try {
    const config = loadConfigImpl();

    writer.info("Registering share...");

    const { share, created } = await registerImpl({
      config,
      body: {
        providerAccount: flags.providerAccount,
        shareName: flags.shareName,
      },
    });

    if (flags.json) {
      writer.write(JSON.stringify(share, null, 2));
      return;
    }

    writer.write(
      chalk.green(
        created ? "Registered share " : "Share already registered: ",
      ) +
        chalk.bold(share.id) +
        chalk.green(` — "${share.label}" (${share.status.state})`),
    );
    writer.info(
      `Track tables with: observe inbound-share table track --share-id ${share.id} --schema <SCHEMA> --table <TABLE> ...`,
    );
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    if ((await errorType(error)) === "ownership_proof_failed") {
      writer.error(OWNERSHIP_PROOF_HINT);
    }
    process.exitCode = 1;
  }
}

export const registerCommand = defineCommand({
  experimental: true,
  loader: async () => register,
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
        brief: "Output the registered share as JSON",
        optional: true,
      },
    },
    aliases: {},
  },
  docs: {
    brief: "Register a Snowflake share with Observe",
    fullDescription: [
      "Register a Snowflake share you have shared with Observe. Before this,",
      "set the share comment with the statement from `observe inbound-share token create`.",
      "Registering a share that is already registered returns it unchanged.",
      "",
      "Example:",
      "  observe inbound-share register --share-name OBSERVE_SHARE --provider-account ACME.PROD",
    ].join("\n"),
  },
});
