import { defineCommand } from "../../lib/stricli-wrappers";
import type { LocalContext } from "../../context";
import { updateIngestToken } from "../../rest/ingest-token/update-ingest-token";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";

interface UpdateIngestTokenFlags {
  name?: string;
  description?: string;
  disabled?: boolean;
}

export interface UpdateIngestTokenDeps {
  loadConfig?: typeof loadConfig;
  updateIngestToken?: typeof updateIngestToken;
}

export async function update(
  this: LocalContext,
  flags: UpdateIngestTokenFlags,
  id: string,
  deps: UpdateIngestTokenDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    updateIngestToken: updateIngestTokenImpl = updateIngestToken,
  } = deps;
  const { process, writer } = this;

  try {
    if (
      flags.name == null &&
      flags.description == null &&
      flags.disabled == null
    ) {
      writer.error(
        "Nothing to update: pass at least one of --name, --description, --disabled",
      );
      process.exitCode = 1;
      return;
    }

    const config = loadConfigImpl();

    const result = await updateIngestTokenImpl({
      config,
      id,
      ingestTokenUpdateRequest: {
        ...(flags.name != null && { name: flags.name }),
        ...(flags.description != null && { description: flags.description }),
        ...(flags.disabled != null && { disabled: flags.disabled }),
      },
    });

    writer.write(JSON.stringify(result, null, 2));
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
        {
          placeholder: "tokenId",
          brief: "Ingest token ID to update",
          parse: String,
        },
      ],
    },
    flags: {
      name: {
        kind: "parsed",
        parse: String,
        brief: "New name for the ingest token (left unchanged if omitted)",
        optional: true,
      },
      description: {
        kind: "parsed",
        parse: String,
        brief:
          "New description for the ingest token (left unchanged if omitted)",
        optional: true,
      },
      disabled: {
        kind: "boolean",
        brief:
          "Disable (--disabled) or enable (--no-disabled) the token; left unchanged if omitted",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Update an ingest token",
    fullDescription:
      "Update an ingest token's name, description, and/or disabled state.\n" +
      "Only the fields you pass are changed; omitted fields keep their current\n" +
      "values.\n\n" +
      "Examples:\n" +
      '  observe ingest-token update <tokenId> --description "New description"\n' +
      "  observe ingest-token update ds1abc123 --disabled\n" +
      "  observe ingest-token update ds1abc123 --no-disabled",
  },
});
