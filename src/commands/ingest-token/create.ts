import { defineCommand } from "../../lib/stricli-wrappers";
import type { LocalContext } from "../../context";
import { createIngestToken } from "../../gql/ingest-token/create-ingest-token";
import { updateIngestTokenAssociation } from "../../gql/ingest-token/update-ingest-token-association";
import { GqlApiError } from "../../gql/gql-request";
import { loadConfig } from "../../lib/config";

interface CreateIngestTokenFlags {
  name: string;
  description?: string;
  datastreamIds?: string;
}

export interface CreateIngestTokenDeps {
  loadConfig?: typeof loadConfig;
}

function parseCommaSeparated(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function create(
  this: LocalContext,
  flags: CreateIngestTokenFlags,
  deps: CreateIngestTokenDeps = {},
): Promise<void> {
  const { loadConfig: loadConfigImpl = loadConfig } = deps;
  const { process, writer } = this;

  try {
    const config = loadConfigImpl();

    const token = await createIngestToken(config, {
      input: {
        name: flags.name,
        description: flags.description,
      },
    });

    const datastreamIDs = flags.datastreamIds
      ? parseCommaSeparated(flags.datastreamIds)
      : [];
    if (datastreamIDs.length > 0) {
      await updateIngestTokenAssociation(config, {
        id: token.id,
        datastreamIDs,
      });
    }

    writer.write(JSON.stringify(token, null, 2));
  } catch (error) {
    if (error instanceof GqlApiError) {
      writer.error(`API Error (${error.statusCode}): ${error.message}`);
    } else {
      const message = error instanceof Error ? error.message : String(error);
      writer.error(`Error: ${message}`);
    }
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
        brief: "Name of the ingest token",
        optional: false,
      },
      description: {
        kind: "parsed",
        parse: String,
        brief: "Description of the ingest token",
        optional: true,
      },
      datastreamIds: {
        kind: "parsed",
        parse: String,
        brief:
          "Comma-separated list of datastream IDs to associate with. If omitted, the token is created with no associations and routing happens automatically at ingest time.",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Create an ingest token",
    fullDescription:
      "Create a new ingest token, optionally associating it with datastreams.\n\n" +
      "When --datastream-ids is omitted, the token is created with no associations\n" +
      "and data is routed automatically by target-package prefix matching.\n\n" +
      "Examples:\n" +
      '  observe ingest-token create --name "k8s-ingest"\n' +
      '  observe ingest-token create --name "k8s-ingest" --datastream-ids "id1,id2,id3"',
  },
});
