import { defineCommand } from "../../lib/stricli-wrappers";
import type { LocalContext } from "../../context";
import { revokeIngestToken } from "../../rest/ingest-token/revoke-ingest-token";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { confirm } from "../../lib/confirm";

interface RevokeIngestTokenFlags {
  yes?: boolean;
}

export interface RevokeIngestTokenDeps {
  loadConfig?: typeof loadConfig;
  revokeIngestToken?: typeof revokeIngestToken;
  confirm?: typeof confirm;
}

export async function revoke(
  this: LocalContext,
  flags: RevokeIngestTokenFlags,
  id: string,
  deps: RevokeIngestTokenDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    revokeIngestToken: revokeIngestTokenImpl = revokeIngestToken,
    confirm: confirmImpl = confirm,
  } = deps;
  const { process, writer } = this;

  try {
    if (!flags.yes) {
      const confirmed = await confirmImpl.call(
        this,
        `Revoke ingest token ${id}? This action is irreversible.`,
      );
      if (!confirmed) {
        writer.error(
          "Revocation cancelled. Re-run with --yes to skip the prompt.",
        );
        process.exitCode = 1;
        return;
      }
    }

    const config = loadConfigImpl();
    await revokeIngestTokenImpl({ config, id });
    writer.success(`Ingest token ${id} revoked.`);
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exitCode = 1;
  }
}

export const revokeCommand = defineCommand({
  experimental: true,
  loader: async () => revoke,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        {
          placeholder: "tokenId",
          brief: "Ingest token ID to revoke",
          parse: String,
        },
      ],
    },
    flags: {
      yes: {
        kind: "boolean",
        brief: "Skip the confirmation prompt",
        optional: true,
      },
    },
    aliases: { y: "yes" },
  },
  docs: {
    brief: "Revoke an ingest token",
    fullDescription:
      "Permanently revoke an ingest token. This action cannot be undone.",
  },
});
