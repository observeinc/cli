import { buildCommand } from "@stricli/core";
import type { LocalContext } from "../../../context.js";
import { createConnection } from "../../../gql/connection/create-connection.js";
import {
  listModuleVersions,
  pickLatestStableVersion,
} from "../../../gql/connection/list-module-versions.js";
import { GqlApiError } from "../../../gql/gql-request.js";
import { loadConfig } from "../../../lib/config.js";
import { variablesToArray } from "../../../lib/connection-vars.js";
import { AWS_MODULE_ID } from "../../../lib/aws-connection.js";

interface CreateAwsConnectionFlags {
  name: string;
  version?: string;
  accountRegion: string;
  accountId: string;
  clusterRegion?: string;
  connectionName?: string;
}

export interface CreateAwsConnectionDeps {
  loadConfig?: typeof loadConfig;
}

export async function createAwsConnectionCmd(
  this: LocalContext,
  flags: CreateAwsConnectionFlags,
  deps: CreateAwsConnectionDeps = {},
): Promise<void> {
  const { loadConfig: loadConfigImpl = loadConfig } = deps;
  const { process, writer } = this;

  try {
    const config = loadConfigImpl();

    let version = flags.version;
    if (version === undefined) {
      const all = await listModuleVersions(config, { id: AWS_MODULE_ID });
      version = pickLatestStableVersion(all);
      if (version === undefined) {
        writer.error(
          `No published versions of module '${AWS_MODULE_ID}' found; pass --version explicitly`,
        );
        process.exit(1);
        return;
      }
    }

    const vars: Record<string, string> = {
      account_region: flags.accountRegion,
      cluster_region: flags.clusterRegion ?? flags.accountRegion,
      account_id: flags.accountId,
      connection_name: flags.connectionName ?? flags.name,
    };

    const connection = await createConnection(config, {
      input: {
        name: flags.name,
        moduleID: AWS_MODULE_ID,
        version,
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

export const createAwsConnectionCommand = buildCommand({
  loader: async () => createAwsConnectionCmd,
  parameters: {
    positional: { kind: "tuple", parameters: [] },
    flags: {
      name: {
        kind: "parsed",
        parse: String,
        brief: "Connection name",
        optional: false,
      },
      version: {
        kind: "parsed",
        parse: String,
        brief:
          "Module version (e.g. 0.5.0). Defaults to the latest stable version published to the workspace.",
        optional: true,
      },
      accountRegion: {
        kind: "parsed",
        parse: String,
        brief:
          "AWS account region (sets account_region; also default for cluster_region)",
        optional: false,
      },
      accountId: {
        kind: "parsed",
        parse: String,
        brief: "AWS account ID",
        optional: false,
      },
      clusterRegion: {
        kind: "parsed",
        parse: String,
        brief: "Cluster region override (defaults to --account-region)",
        optional: true,
      },
      connectionName: {
        kind: "parsed",
        parse: String,
        brief: "Module connection_name variable (defaults to --name)",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Create an AWS data connection",
    fullDescription:
      `Creates a new AWS data connection (module: ${AWS_MODULE_ID}).\n\n` +
      "--version defaults to the latest stable version published to the\n" +
      "workspace; pass it explicitly to pin to a specific release.\n\n" +
      "Example:\n" +
      "  observe data-connection create aws \\\n" +
      "    --name my-aws \\\n" +
      "    --account-region us-west-2 --account-id 123456789012",
  },
});
