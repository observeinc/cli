import { defineCommand } from "../../lib/stricli-wrappers";
import type { LocalContext } from "../../context";
import { updateIngestToken } from "../../gql/ingest-token/update-ingest-token";
import { viewIngestToken } from "../../gql/ingest-token/view-ingest-token";
import { GqlApiError } from "../../gql/gql-request";
import { loadConfig } from "../../lib/config";

interface UpdateIngestTokenFlags {
  name?: string;
  description?: string;
  disabled?: boolean;
}

export interface UpdateIngestTokenDeps {
  loadConfig?: typeof loadConfig;
  viewIngestToken?: typeof viewIngestToken;
}

export async function update(
  this: LocalContext,
  flags: UpdateIngestTokenFlags,
  id: string,
  deps: UpdateIngestTokenDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    viewIngestToken: viewIngestTokenImpl = viewIngestToken,
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
      process.exit(1);
    }

    const config = loadConfigImpl();

    // `disabled` is a non-nullable bool on the resolver: a request that omits
    // it resets the token to enabled. To keep updates partial we backfill the
    // current value when the caller doesn't pass --disabled, so editing only
    // the name or description can't silently re-enable a disabled token.
    let disabled = flags.disabled;
    if (disabled == null) {
      const current = await viewIngestTokenImpl(config, { id });
      disabled = current.disabled ?? false;
    }

    const result = await updateIngestToken(config, {
      id,
      input: {
        ...(flags.name != null && { name: flags.name }),
        ...(flags.description != null && { description: flags.description }),
        disabled,
      },
    });

    writer.write(JSON.stringify(result, null, 2));
  } catch (error) {
    if (error instanceof GqlApiError) {
      writer.error(`API Error (${error.statusCode}): ${error.message}`);
    } else {
      const message = error instanceof Error ? error.message : String(error);
      writer.error(`Error: ${message}`);
    }
    process.exit(1);
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
      '  observe ingest-token update 123 --description "New description"\n' +
      "  observe ingest-token update 123 --disabled\n" +
      "  observe ingest-token update 123 --no-disabled",
  },
});
