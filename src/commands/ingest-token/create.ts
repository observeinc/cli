import { defineCommand } from "../../lib/stricli-wrappers";
import type { LocalContext } from "../../context";
import { createIngestToken } from "../../rest/ingest-token/create-ingest-token";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";

interface CreateIngestTokenFlags {
  name?: string;
  description?: string;
}

export interface CreateIngestTokenDeps {
  loadConfig?: typeof loadConfig;
  createIngestToken?: typeof createIngestToken;
}

export async function create(
  this: LocalContext,
  flags: CreateIngestTokenFlags,
  deps: CreateIngestTokenDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    createIngestToken: createIngestTokenImpl = createIngestToken,
  } = deps;
  const { process, writer } = this;

  try {
    const config = loadConfigImpl();

    const token = await createIngestTokenImpl({
      config,
      ingestTokenCreateRequest: {
        name: flags.name,
        description: flags.description,
      },
    });

    writer.write(JSON.stringify(token, null, 2));
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exitCode = 1;
  }
}

export const createCommand = defineCommand({
  experimental: true,
  loader: async () => create,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
    flags: {
      name: {
        kind: "parsed",
        parse: String,
        brief: "Name of the ingest token (generated if omitted)",
        optional: true,
      },
      description: {
        kind: "parsed",
        parse: String,
        brief: "Description of the ingest token",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Create an ingest token",
    fullDescription:
      "Create a new ingest token. The secret is shown exactly once and cannot be retrieved again.\n\n" +
      "Examples:\n" +
      '  observe ingest-token create --name "k8s-ingest"',
  },
});
