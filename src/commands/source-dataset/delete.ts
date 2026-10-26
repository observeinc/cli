import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { getSourceDataset } from "../../rest/source-dataset/get-source-dataset";
import { deleteSourceDataset } from "../../rest/source-dataset/delete-source-dataset";
import { loadConfig } from "../../lib/config";
import { makeDeleteConfirm } from "../../lib/confirm";
import { errorType, formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";

interface DeleteSourceDatasetFlags {
  yes?: boolean;
  force?: boolean;
  json?: boolean;
}

export interface DeleteSourceDatasetDeps {
  loadConfig?: typeof loadConfig;
  getSourceDataset?: typeof getSourceDataset;
  deleteSourceDataset?: typeof deleteSourceDataset;
  confirmFn?: (label: string) => Promise<boolean>;
}

export async function remove(
  this: LocalContext,
  flags: DeleteSourceDatasetFlags,
  id: string,
  deps: DeleteSourceDatasetDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    getSourceDataset: getSD = getSourceDataset,
    deleteSourceDataset: deleteSD = deleteSourceDataset,
    confirmFn,
  } = deps;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, { muted: flags.json === true });
  if (flags.json && !flags.yes) {
    writer.error(
      "--json needs --yes: this command asks for confirmation, which cannot be answered with JSON output.",
    );
    process.exitCode = 1;
    return;
  }

  try {
    const config = loadConfigImpl();

    if (flags.force) {
      writer.warn(
        "--force deletes even when other datasets depend on this one. They are kept and rebuilt, but dashboards and worksheets that read from it stop working.",
      );
    }

    if (!flags.yes) {
      if (
        !confirmFn &&
        !(process.stdin as NodeJS.ReadStream | undefined)?.isTTY
      ) {
        writer.error(
          "Deleting a source dataset is irreversible. Use --yes to confirm deletion in non-interactive mode.",
        );
        process.exitCode = 1;
        return;
      }
      const dataset = await getSD({ config, id });
      writer.warn(
        `Deleting source dataset ${chalk.bold(id)} ("${dataset.label}") removes its data. This cannot be undone.`,
      );
      const confirm =
        confirmFn ??
        makeDeleteConfirm({ process, resourceKind: "source dataset" });
      const confirmed = await confirm(dataset.label);
      if (!confirmed) {
        writer.error("Deletion cancelled.");
        process.exitCode = 1;
        return;
      }
    }

    await deleteSD({ config, id, force: flags.force });

    if (flags.json) {
      writer.write(JSON.stringify({ success: true, id }, null, 2));
      return;
    }

    writer.write(chalk.green(`Deleted source dataset ${chalk.bold(id)}.`));
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    const type = await errorType(error);
    if (type === "dependents_exist") {
      writer.error(
        "Other datasets are built on this one. Re-run with --force to delete it anyway; they are kept and rebuilt.",
      );
    } else if (type === "ingest_token_active") {
      writer.error(
        "An enabled ingest token still sends data to this dataset. Disable or delete the token first; --force does not skip this.",
      );
    }
    process.exitCode = 1;
  }
}

export const deleteCommand = defineCommand({
  experimental: true,
  loader: async () => remove,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        {
          placeholder: "sourceDatasetId",
          brief: "Source dataset ID",
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
      force: {
        kind: "boolean",
        brief:
          "Delete even when other datasets depend on it (breaks dashboards and worksheets that use it)",
        optional: true,
      },
      json: {
        kind: "boolean",
        brief: "Output the result as JSON (requires --yes)",
        optional: true,
      },
    },
    aliases: {
      y: "yes",
    },
  },
  docs: {
    brief: "Delete a source dataset",
    fullDescription: [
      "Delete a source dataset by ID via the /v1/source-datasets REST API.",
      "",
      "The delete is refused while other datasets depend on it (use --force to",
      "delete anyway), while an enabled ingest token still sends to it, or while",
      "a poller or filedrop still ingests to it. --force does not skip the last two.",
    ].join("\n"),
  },
});
