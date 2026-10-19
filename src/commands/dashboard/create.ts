import { defineCommand } from "../../lib/stricli-wrappers";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { LocalContext } from "../../context";
import { createDashboard } from "../../rest/dashboard/create-dashboard";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import { parseJsonFile } from "../../lib/parsers";
import { buildDashboardCreateRequest } from "./parse";

interface CreateDashboardFlags {
  file: string;
  json?: boolean;
}

export interface CreateDashboardDeps {
  loadConfig?: typeof loadConfig;
  createDashboard?: typeof createDashboard;
  readFile?: (path: string) => string;
}

export async function create(
  this: LocalContext,
  flags: CreateDashboardFlags,
  deps: CreateDashboardDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    createDashboard: createDashboardImpl = createDashboard,
    readFile: readFileImpl = (p) => readFileSync(p, "utf-8"),
  } = deps;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, { muted: flags.json === true });

  try {
    const config = loadConfigImpl();

    const raw = readFileImpl(resolve(flags.file));
    const parsed = parseJsonFile<Record<string, unknown>>(raw, "--file");
    const dashboard = buildDashboardCreateRequest(parsed);

    writer.info("Creating dashboard...");

    const created = await createDashboardImpl({ config, dashboard });

    if (flags.json) {
      writer.write(JSON.stringify(created, null, 2));
      return;
    }

    writer.success(`Dashboard ${created.id} created.`);
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exitCode = 1;
  }
}

export const createCommand = defineCommand({
  experimental: true,
  loader: async () => create,
  parameters: {
    positional: { kind: "tuple", parameters: [] },
    flags: {
      file: {
        kind: "parsed",
        parse: String,
        brief: "Path to JSON file containing the dashboard to create",
        optional: false,
      },
      json: {
        kind: "boolean",
        brief: "Output the created dashboard as JSON",
        optional: true,
      },
    },
    aliases: {},
  },
  docs: {
    brief: "Create a dashboard",
    fullDescription: [
      "Create a dashboard from a JSON file.",
      "",
      'The file must contain "schemaVersion": 2, a "name", and a "definition"',
      'containing a "layout". Optional fields: description, visibility',
      "(Listed or Hidden), and objectTags.",
      "",
      "Server-assigned fields (id, createdAt, updatedAt, createdBy, updatedBy)",
      "are ignored.",
      "",
      "Example:",
      "  observe dashboard create --file dashboard.json",
    ].join("\n"),
  },
});
