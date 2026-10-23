import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { getSetupInfo } from "../../rest/inbound-share/get-setup-info";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import { parseShareName, shellQuote, withShareName, writeSteps } from "./sql";

interface SetupFlags {
  shareName?: string;
  json?: boolean;
}

export interface SetupDeps {
  loadConfig?: typeof loadConfig;
  getSetupInfo?: typeof getSetupInfo;
}

export async function setup(
  this: LocalContext,
  flags: SetupFlags,
  deps: SetupDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    getSetupInfo: getSetup = getSetupInfo,
  } = deps;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, { muted: flags.json === true });

  try {
    const config = loadConfigImpl();

    writer.info("Fetching inbound share setup info...");

    const info = await getSetup({ config });

    const guidance = {
      ...info.guidance,
      setupSql: withShareName(info.guidance.setupSql, flags.shareName),
      providerChecks: withShareName(
        info.guidance.providerChecks,
        flags.shareName,
      ),
    };

    if (flags.json) {
      writer.write(JSON.stringify({ ...info, guidance }, null, 2));
      return;
    }

    const write = (text: string) => writer.write(text);
    const style = { bold: chalk.bold, sql: chalk.cyan };
    const label = (text: string) => chalk.dim(text.padEnd(20));

    write(label("Consumer account") + chalk.bold(info.consumerAccount));
    write(label("Region") + info.region);
    write(label("Cloud") + (info.cloud ?? "unknown"));
    write("");
    write(guidance.summary);

    writeSteps(write, guidance.setupSql, style);

    write("");
    write(chalk.bold("Check your setup:"));
    writeSteps(write, guidance.providerChecks, style);

    write("");
    write(chalk.bold("Before you register:"));
    for (const item of guidance.checklist) {
      write(`   - ${item}`);
    }

    write("");
    write("Then create a registration token and register the share:");
    write(
      chalk.cyan(
        `   observe inbound-share token create --share-name ${flags.shareName ? shellQuote(flags.shareName) : "<your_share_name>"} --provider-account <ORG>.<ACCOUNT>`,
      ),
    );
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exitCode = 1;
  }
}

export const setupCommand = defineCommand({
  experimental: true,
  loader: async () => setup,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
    flags: {
      shareName: {
        kind: "parsed",
        parse: parseShareName,
        brief: "Fill in this share name in the SQL",
        optional: true,
      },
      json: {
        kind: "boolean",
        brief: "Output the setup info as JSON",
        optional: true,
      },
    },
    aliases: {},
  },
  docs: {
    brief: "Show how to share Snowflake data with Observe",
    fullDescription: [
      "Show Observe's consumer Snowflake account, its region and cloud, the SQL",
      "to run in your provider account, and checks to run before registering.",
      "",
      "With --json, prints the API response as is.",
      "",
      "Example:",
      "  observe inbound-share setup --share-name OBSERVE_SHARE",
    ].join("\n"),
  },
});
