import { buildCommand } from "@stricli/core";
import type { LocalContext } from "../../context.js";
import { createConnection } from "../../gql/connection/create-connection.js";
import { GqlApiError } from "../../gql/gql-request.js";
import { loadConfig } from "../../lib/config.js";
import { parseVariables, variablesToArray } from "../../lib/connection-vars.js";

interface CreateConnectionFlags {
  name: string;
  moduleId: string;
  version: string;
  workspaceId?: string;
  variables?: string;
  accountRegion?: string;
  clusterRegion?: string;
  accountId?: string;
  connectionName?: string;
}

export interface CreateConnectionDeps {
  loadConfig?: typeof loadConfig;
}

export async function createConnectionCmd(
  this: LocalContext,
  flags: CreateConnectionFlags,
  deps: CreateConnectionDeps = {},
): Promise<void> {
  const { loadConfig: loadConfigImpl = loadConfig } = deps;
  const { process, writer } = this;

  try {
    const config = loadConfigImpl();

    let vars;
    try {
      vars = parseVariables(flags.variables);
    } catch (e) {
      writer.error(
        `--variables: ${e instanceof Error ? e.message : String(e)}`,
      );
      process.exit(1);
      return;
    }

    // Named flags override --variables entries
    if (flags.connectionName !== undefined)
      vars.connection_name = flags.connectionName;
    if (flags.accountRegion !== undefined)
      vars.account_region = flags.accountRegion;
    if (flags.accountId !== undefined) vars.account_id = flags.accountId;
    // cluster_region defaults to account_region if not set explicitly
    if (flags.clusterRegion !== undefined) {
      vars.cluster_region = flags.clusterRegion;
    } else if (
      flags.accountRegion !== undefined &&
      vars.cluster_region === undefined
    ) {
      vars.cluster_region = flags.accountRegion;
    }

    const connection = await createConnection(config, {
      workspaceId: flags.workspaceId,
      input: {
        name: flags.name,
        moduleID: flags.moduleId,
        version: flags.version,
        variables: variablesToArray(vars),
      },
    });

    writer.write(JSON.stringify(connection, null, 2));
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

export const createConnectionCommand = buildCommand({
  loader: async () => createConnectionCmd,
  parameters: {
    positional: { kind: "tuple", parameters: [] },
    flags: {
      name: {
        kind: "parsed",
        parse: String,
        brief: "Connection name",
        optional: false,
      },
      moduleId: {
        kind: "parsed",
        parse: String,
        brief: "Module ID (e.g. observeinc/connection/aws)",
        optional: false,
      },
      version: {
        kind: "parsed",
        parse: String,
        brief: "Module version",
        optional: false,
      },
      workspaceId: {
        kind: "parsed",
        parse: String,
        brief: "Workspace ID (defaults to the account's default workspace)",
        optional: true,
      },
      accountRegion: {
        kind: "parsed",
        parse: String,
        brief:
          "AWS account region (sets account_region and cluster_region variables)",
        optional: true,
      },
      clusterRegion: {
        kind: "parsed",
        parse: String,
        brief:
          "Cluster region override (sets cluster_region; defaults to --account-region)",
        optional: true,
      },
      accountId: {
        kind: "parsed",
        parse: String,
        brief: "AWS account ID (sets account_id variable)",
        optional: true,
      },
      connectionName: {
        kind: "parsed",
        parse: String,
        brief: "Module connection_name variable (defaults to --name)",
        optional: true,
      },
      variables: {
        kind: "parsed",
        parse: String,
        brief:
          "Additional module variables as key=value pairs or JSON array, e.g. 'k=v,k2=v2'",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Create a data connection",
    fullDescription:
      "Creates a new data connection for a given module and version.\n\n" +
      "Named flags (--account-region, --account-id, etc.) override any matching\n" +
      "entry in --variables. --cluster-region defaults to --account-region.\n\n" +
      "Example (AWS):\n" +
      "  observe data-connection create \\\n" +
      "    --name my-aws --module-id observeinc/connection/aws --version 0.5.0 \\\n" +
      "    --account-region us-west-2 --account-id 123456789012",
  },
});
