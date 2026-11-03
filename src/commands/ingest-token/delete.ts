import { defineCommand } from "../../lib/stricli-wrappers";
import type { LocalContext } from "../../context";
import { deleteIngestToken as deleteIngestTokenApi } from "../../rest/ingest-token/delete-ingest-token";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { confirm } from "../../lib/confirm";

interface DeleteIngestTokenFlags {
  yes?: boolean;
}

export interface DeleteIngestTokenDeps {
  loadConfig?: typeof loadConfig;
  deleteIngestToken?: typeof deleteIngestTokenApi;
  confirm?: typeof confirm;
}

export async function deleteIngestTokenCommand(
  this: LocalContext,
  flags: DeleteIngestTokenFlags,
  id: string,
  deps: DeleteIngestTokenDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    deleteIngestToken: deleteIngestTokenImpl = deleteIngestTokenApi,
    confirm: confirmImpl = confirm,
  } = deps;
  const { process, writer } = this;

  try {
    if (!flags.yes) {
      const confirmed = await confirmImpl.call(
        this,
        `Delete ingest token ${id}? This action is irreversible.`,
      );
      if (!confirmed) {
        writer.error(
          "Deletion cancelled. Re-run with --yes to skip the prompt.",
        );
        process.exitCode = 1;
        return;
      }
    }

    const config = loadConfigImpl();
    await deleteIngestTokenImpl({ config, id });
    writer.success(`Ingest token ${id} deleted.`);
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exitCode = 1;
  }
}

export const deleteCommand = defineCommand({
  experimental: true,
  loader: async () => deleteIngestTokenCommand,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        {
          placeholder: "tokenId",
          brief: "Ingest token ID to delete",
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
    brief: "Delete an ingest token",
    fullDescription:
      "Permanently delete an ingest token. This action cannot be undone.",
  },
});
