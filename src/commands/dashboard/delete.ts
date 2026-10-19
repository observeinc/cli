import { defineCommand } from "../../lib/stricli-wrappers";
import type { LocalContext } from "../../context";
import { deleteDashboard } from "../../rest/dashboard/delete-dashboard";
import { getDashboard } from "../../rest/dashboard/get-dashboard";
import { loadConfig } from "../../lib/config";
import { makeDeleteConfirm } from "../../lib/confirm";
import { formatApiError } from "../../lib/format-error";

interface DeleteDashboardFlags {
  yes?: boolean;
}

export interface DeleteDashboardDeps {
  loadConfig?: typeof loadConfig;
  deleteDashboard?: typeof deleteDashboard;
  getDashboard?: typeof getDashboard;
  confirmFn?: (dashboardName: string) => Promise<boolean>;
}

export async function deleteDashboardCommand(
  this: LocalContext,
  flags: DeleteDashboardFlags,
  dashboardId: string,
  deps: DeleteDashboardDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    deleteDashboard: deleteDashboardImpl = deleteDashboard,
    getDashboard: getDashboardImpl = getDashboard,
    confirmFn,
  } = deps;
  const { process, writer } = this;

  try {
    const config = loadConfigImpl();

    if (!flags.yes) {
      // When no confirmFn is injected (real usage), require a TTY.
      if (
        !confirmFn &&
        !(process.stdin as NodeJS.ReadStream | undefined)?.isTTY
      ) {
        writer.error(
          "Deleting a dashboard is irreversible. Use --yes to confirm deletion in non-interactive mode.",
        );
        process.exitCode = 1;
        return;
      }

      const dashboard = await getDashboardImpl({ config, id: dashboardId });
      if (!dashboard) {
        writer.error(`Dashboard not found: ${dashboardId}`);
        process.exitCode = 1;
        return;
      }

      const confirm =
        confirmFn ?? makeDeleteConfirm({ process, resourceKind: "dashboard" });
      const confirmed = await confirm(dashboard.name);
      if (!confirmed) {
        writer.error("Deletion cancelled.");
        process.exitCode = 1;
        return;
      }
    }

    writer.info("Deleting dashboard...");

    await deleteDashboardImpl({ config, id: dashboardId });

    writer.success(`Dashboard ${dashboardId} deleted.`);
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exitCode = 1;
  }
}

export const deleteCommand = defineCommand({
  experimental: true,
  loader: async () => deleteDashboardCommand,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        { placeholder: "dashboardId", brief: "Dashboard ID", parse: String },
      ],
    },
    flags: {
      yes: {
        kind: "boolean",
        brief: "Skip confirmation prompt (required in non-interactive mode)",
        optional: true,
      },
    },
    aliases: {},
  },
  docs: {
    brief: "Delete a dashboard",
  },
});
