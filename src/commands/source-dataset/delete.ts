import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { getSourceDataset } from "../../rest/source-dataset/get-source-dataset";
import { deleteSourceDataset } from "../../rest/source-dataset/delete-source-dataset";
import { ResponseError } from "../../rest/generated/runtime";
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

  if (
    !flags.yes &&
    !confirmFn &&
    !(process.stdin as NodeJS.ReadStream | undefined)?.isTTY
  ) {
    writer.error(
      "Deleting a source dataset is irreversible. Use --yes to confirm deletion in non-interactive mode.",
    );
    process.exitCode = 1;
    return;
  }

  let config: ReturnType<typeof loadConfig>;
  let label: string;
  try {
    config = loadConfigImpl();
    // DELETE answers 204 for an id that does not exist, so look it up first.
    label = (await getSD({ config, id })).label;
  } catch (error) {
    if (error instanceof ResponseError && error.response.status === 404) {
      writer.error(`Source dataset not found: ${id}`);
    } else {
      writer.error(`Error: ${await formatApiError(error)}`);
    }
    process.exitCode = 1;
    return;
  }

  try {
    if (flags.force) {
      writer.warn(
        "--force deletes even when other datasets, dashboards or worksheets depend on this one. Dependent datasets are kept and rebuilt, but dashboards and worksheets that read from it stop working.",
      );
    }

    if (!flags.yes) {
      writer.warn(
        `Deleting source dataset ${chalk.bold(id)} ("${label}") removes its data. If it came from an older multi-type source, the datasets created with it are deleted too. This cannot be undone.`,
      );
      const confirm =
        confirmFn ??
        makeDeleteConfirm({ process, resourceKind: "source dataset" });
      const confirmed = await confirm(label);
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
        "Other datasets, dashboards or worksheets depend on this one. Re-run with --force to delete it anyway; dependent datasets are kept and rebuilt, but dashboards and worksheets that read from it stop working.",
      );
    } else if (type === "ingest_token_active") {
      writer.error(
        "An enabled ingest token still sends data to this dataset. Disable or delete the token first; --force does not skip this.",
      );
    } else if (type === "ingest_config_active") {
      writer.error(
        "A poller or filedrop still ingests into this dataset. Remove it first; --force does not skip this.",
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
          "Delete even when other datasets, dashboards or worksheets depend on it (breaks the dashboards and worksheets)",
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
      "The delete is refused while other datasets, dashboards or worksheets",
      "depend on it (use --force to delete anyway), while an enabled ingest token",
      "still sends to it, or while a poller or filedrop still ingests to it.",
      "--force does not skip the last two.",
      "",
      "Deleting a dataset from an older multi-type source also deletes the",
      "datasets created with it.",
    ].join("\n"),
  },
});
