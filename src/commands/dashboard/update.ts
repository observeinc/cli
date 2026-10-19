import { defineCommand } from "../../lib/stricli-wrappers";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { LocalContext } from "../../context";
import { updateDashboard } from "../../rest/dashboard/update-dashboard";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import { parseJsonFile } from "../../lib/parsers";
import { buildDashboardPatch, PATCHABLE_FIELD_LIST } from "./parse";

interface UpdateDashboardFlags {
  file: string;
  json?: boolean;
}

export interface UpdateDashboardDeps {
  loadConfig?: typeof loadConfig;
  updateDashboard?: typeof updateDashboard;
  readFile?: (path: string) => string;
}

export async function update(
  this: LocalContext,
  flags: UpdateDashboardFlags,
  dashboardId: string,
  deps: UpdateDashboardDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    updateDashboard: updateDashboardImpl = updateDashboard,
    readFile: readFileImpl = (p) => readFileSync(p, "utf-8"),
  } = deps;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, { muted: flags.json === true });

  try {
    const config = loadConfigImpl();

    const raw = readFileImpl(resolve(flags.file));
    const parsed = parseJsonFile<Record<string, unknown>>(raw, "--file");
    const patch = buildDashboardPatch(parsed);

    writer.info("Updating dashboard...");

    const updated = await updateDashboardImpl({
      config,
      id: dashboardId,
      patch,
    });

    if (flags.json) {
      writer.write(JSON.stringify(updated, null, 2));
      return;
    }

    writer.success(`Dashboard ${dashboardId} updated.`);
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
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
        { placeholder: "dashboardId", brief: "Dashboard ID", parse: String },
      ],
    },
    flags: {
      file: {
        kind: "parsed",
        parse: String,
        brief:
          "Path to a dashboard JSON file (e.g. from `dashboard view --json`)",
        optional: false,
      },
      json: {
        kind: "boolean",
        brief: "Output the updated dashboard as JSON",
        optional: true,
      },
    },
    aliases: {},
  },
  docs: {
    brief: "Update a dashboard",
    fullDescription: [
      "Update a dashboard from a JSON file.",
      "",
      "Edit flow:",
      "  observe dashboard view <id> --json > dashboard.json",
      "  # edit dashboard.json",
      "  observe dashboard update <id> --file dashboard.json",
      "",
      "This is a merge-patch: only fields present in the file are applied, and",
      "a present `definition` replaces the whole document rather than merging.",
      `Patchable fields: ${PATCHABLE_FIELD_LIST}. Read-only fields (id,`,
      "createdAt, updatedAt, createdBy, updatedBy, managedBy) are ignored.",
      "",
      "`description` is the only field that accepts null, which clears it.",
    ].join("\n"),
  },
});
