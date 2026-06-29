import { defineCommand } from "../../lib/stricli-wrappers";
import type { LocalContext } from "../../context";
import { updateDatastream } from "../../gql/datastream/update-datastream";
import { viewDatastream } from "../../gql/datastream/view-datastream";
import { GqlApiError } from "../../gql/gql-request";
import { loadConfig } from "../../lib/config";

interface UpdateDatastreamFlags {
  name?: string;
  description?: string;
}

export interface UpdateDatastreamDeps {
  loadConfig?: typeof loadConfig;
  viewDatastream?: typeof viewDatastream;
}

export async function update(
  this: LocalContext,
  flags: UpdateDatastreamFlags,
  id: string,
  deps: UpdateDatastreamDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    viewDatastream: viewDatastreamImpl = viewDatastream,
  } = deps;
  const { process, writer } = this;

  try {
    if (flags.name == null && flags.description == null) {
      writer.error(
        "Nothing to update: pass at least one of --name, --description",
      );
      process.exit(1);
    }

    const config = loadConfigImpl();

    // The resolver requires `name` and always writes it, so a request that
    // omits it would reset the datastream's name. To keep updates partial we
    // backfill the current name when the caller doesn't pass one.
    let name = flags.name;
    if (name == null) {
      const current = await viewDatastreamImpl(config, { id });
      name = current.name;
    }

    const result = await updateDatastream(config, {
      id,
      datastream: {
        name,
        ...(flags.description != null && { description: flags.description }),
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
  loader: async () => update,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        {
          brief: "Datastream ID to update",
          parse: String,
        },
      ],
    },
    flags: {
      name: {
        kind: "parsed",
        parse: String,
        brief: "New name for the datastream (left unchanged if omitted)",
        optional: true,
      },
      description: {
        kind: "parsed",
        parse: String,
        brief: "New description for the datastream (left unchanged if omitted)",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Update a datastream",
    fullDescription:
      "Update a datastream's name and/or description. Only the fields you pass\n" +
      "are changed; omitted fields keep their current values.\n\n" +
      "Direct Write settings cannot be changed after creation and are not\n" +
      "editable here.\n\n" +
      "Examples:\n" +
      '  observe datastream update 123 --description "New description"\n' +
      '  observe datastream update 123 --name "New Name"',
  },
});
