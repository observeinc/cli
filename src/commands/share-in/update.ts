import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { updateShare } from "../../rest/share-in/update-share";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import { isNotFound } from "./shared";

interface UpdateShareFlags {
  label: string;
  json?: boolean;
}

export interface UpdateShareDeps {
  loadConfig?: typeof loadConfig;
  updateShare?: typeof updateShare;
}

export async function update(
  this: LocalContext,
  flags: UpdateShareFlags,
  shareId: string,
  deps: UpdateShareDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    updateShare: updateImpl = updateShare,
  } = deps;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, { muted: flags.json === true });

  try {
    const config = loadConfigImpl();

    writer.info("Updating share...");

    const share = await updateImpl({
      config,
      shareId,
      body: { label: flags.label },
    });

    if (flags.json) {
      writer.write(JSON.stringify(share, null, 2));
      return;
    }

    writer.write(
      chalk.green("Updated share ") +
        chalk.bold(share.id) +
        chalk.green(` — "${share.label}"`),
    );
  } catch (error) {
    if (isNotFound(error)) {
      writer.error(`Share not found: ${shareId}`);
    } else {
      writer.error(`Error: ${await formatApiError(error)}`);
    }
    process.exitCode = 1;
  }
}

export const updateCommand = defineCommand({
  experimental: true,
  loader: async () => update,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        { placeholder: "shareId", brief: "Share ID", parse: String },
      ],
    },
    flags: {
      label: {
        kind: "parsed",
        parse: String,
        brief: "New display label",
      },
      json: {
        kind: "boolean",
        brief: "Output the updated share as JSON",
        optional: true,
      },
    },
    aliases: {},
  },
  docs: {
    brief: "Change a share's display label",
    fullDescription: [
      "Only the display label can change. The Snowflake share name and provider",
      "account identify the share and are fixed.",
      "",
      "Example:",
      '  observe share-in update 41000100 --label "Orders (prod)"',
    ].join("\n"),
  },
});
