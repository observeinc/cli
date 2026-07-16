import { defineCommand } from "../../lib/stricli-wrappers";
import type { LocalContext } from "../../context.js";
import { createDatasource } from "../../gql/connection/create-datasource.js";
import { getConnection } from "../../gql/connection/get-connection.js";
import { GqlApiError } from "../../gql/gql-request.js";
import { loadConfig } from "../../lib/config.js";
import type { DatasourceConfigInput } from "../../gql/generated/graphql.js";
import {
  AWS_MODULE_ID,
  expectedAwsDatasourceName,
} from "../../lib/aws-connection.js";
import { parseVariables, variablesToArray } from "../../lib/connection-vars.js";
import { loadDatasourceConfig } from "../../lib/datasource-config.js";
import { parseDatasourceType } from "./parse.js";

interface CreateDatasourceFlags {
  name?: string;
  connectionId: string;
  datastreamId: string;
  type?: string;
  workspaceId?: string;
  variables?: string;
  config?: string;
  configFile?: string;
  collectLogs?: boolean;
  collectMetrics?: boolean;
  collectResources?: boolean;
}

export interface CreateDatasourceDeps {
  loadConfig?: typeof loadConfig;
}

export async function createDatasourceCmd(
  this: LocalContext,
  flags: CreateDatasourceFlags,
  deps: CreateDatasourceDeps = {},
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
      process.exitCode = 1;
      return;
    }

    // Named flags override --variables entries
    if (flags.collectLogs !== undefined)
      vars.collect_logs = String(flags.collectLogs);
    if (flags.collectMetrics !== undefined)
      vars.collect_metrics = String(flags.collectMetrics);
    if (flags.collectResources !== undefined)
      vars.collect_resource_info = String(flags.collectResources);

    let datasourceConfig: DatasourceConfigInput | undefined;
    try {
      datasourceConfig = loadDatasourceConfig(flags.config, flags.configFile);
    } catch (e) {
      writer.error(e instanceof Error ? e.message : String(e));
      process.exitCode = 1;
      return;
    }

    // For AWS connections (filedrop / poller), the datasource name MUST be
    // <connectionName>-<suffix> because the server derives the assumeRoleArn
    // from the datasource name and the CFN stack creates IAM roles with
    // exactly that name. Anything else means the deployed stack can't
    // authenticate. Auto-derive when --name is omitted; refuse a mismatched
    // explicit --name so the user fails fast instead of months later.
    const dsType = parseDatasourceType(flags.type);
    const connection = await getConnection(config, { id: flags.connectionId });
    const expectedName =
      connection.moduleID === AWS_MODULE_ID
        ? expectedAwsDatasourceName(connection.name, dsType)
        : undefined;

    let name: string | undefined = flags.name;
    if (expectedName !== undefined) {
      if (name === undefined) {
        name = expectedName;
      } else if (name !== expectedName) {
        writer.error(
          `For AWS ${dsType ?? "<unknown>"} datasources, --name must be '${expectedName}' (or omit --name to auto-derive). The CloudFormation stack creates the IAM role with this exact name; using a different name would mean the deployed stack can't authenticate.`,
        );
        process.exitCode = 1;
        return;
      }
    } else if (name === undefined) {
      writer.error(
        "--name is required (auto-derivation only applies to AWS filedrop/poller datasources)",
      );
      process.exitCode = 1;
      return;
    }

    const datasource = await createDatasource(config, {
      workspaceId: flags.workspaceId,
      input: {
        name,
        dataConnectionID: flags.connectionId,
        datastreamID: flags.datastreamId,
        type: dsType,
        variables: variablesToArray(vars),
        clientStackAttributes: [],
        config: datasourceConfig,
      },
    });

    writer.write(JSON.stringify(datasource, null, 2));
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

export const createDatasourceCommand = defineCommand({
  experimental: true,
  loader: async () => createDatasourceCmd,
  parameters: {
    positional: { kind: "tuple", parameters: [] },
    flags: {
      name: {
        kind: "parsed",
        parse: String,
        brief:
          "Datasource name. Optional for AWS filedrop/poller datasources (auto-derived from the connection name); required otherwise.",
        optional: true,
      },
      connectionId: {
        kind: "parsed",
        parse: String,
        brief: "ID of the parent data connection",
        optional: false,
      },
      datastreamId: {
        kind: "parsed",
        parse: String,
        brief: "Datastream ID to associate with this datasource",
        optional: false,
      },
      type: {
        kind: "parsed",
        parse: String,
        brief: "Datasource type (e.g. filedrop, poller)",
        optional: true,
      },
      workspaceId: {
        kind: "parsed",
        parse: String,
        brief: "Workspace ID (defaults to the account's default workspace)",
        optional: true,
      },
      collectLogs: {
        kind: "boolean",
        brief: "Collect CloudWatch logs (sets collect_logs variable)",
        optional: true,
      },
      collectMetrics: {
        kind: "boolean",
        brief: "Collect CloudWatch metrics (sets collect_metrics variable)",
        optional: true,
      },
      collectResources: {
        kind: "boolean",
        brief:
          "Collect AWS resource info via Config (sets collect_resource_info variable)",
        optional: true,
      },
      variables: {
        kind: "parsed",
        parse: String,
        brief:
          "Additional datasource variables as key=value pairs or JSON array, e.g. 'k=v,k2=v2'",
        optional: true,
      },
      config: {
        kind: "parsed",
        parse: String,
        brief:
          "Datasource config as a JSON object. For AWS, awsCollectionStackConfig.awsServiceMetricsList drives the AWS::CloudWatch::MetricStream resources created by the CloudFormation stack. Mutually exclusive with --config-file.",
        optional: true,
      },
      configFile: {
        kind: "parsed",
        parse: String,
        brief:
          "Path to a JSON file containing the datasource config. Mutually exclusive with --config.",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Create a datasource",
    fullDescription:
      "Creates a new datasource within an existing data connection.\n\n" +
      "Named flags (--collect-logs, --collect-metrics, --collect-resources) override\n" +
      "any matching entry in --variables.\n\n" +
      "--config schema (DatasourceConfigInput as JSON):\n\n" +
      "  AWS filedrop (--type filedrop):\n" +
      "  {\n" +
      '    "awsCollectionStackConfig": {\n' +
      '      "logGroupNamePatterns":         ["*"],         // CloudWatch log group patterns to subscribe to\n' +
      '      "excludeLogGroupNamePatterns":  [],            // patterns to skip\n' +
      '      "configResourceList":           ["*"],         // AWS::Config resource types ("*" for all)\n' +
      '      "sourceBucketNames":            [],            // S3 buckets to forward via event notifications\n' +
      '      "configDeliveryBucketName":     "",            // existing AWS Config delivery bucket (optional)\n' +
      '      "awsServiceMetricsList": [                     // each entry → one AWS::CloudWatch::MetricStream resource in the CF stack\n' +
      "        {\n" +
      '          "namespace":   "AWS/EC2",                  // REQUIRED — e.g. AWS/EC2, AWS/RDS, AWS/Lambda\n' +
      '          "metricNames": ["CPUUtilization"],         // REQUIRED — [] streams every metric in the namespace (AWS-side), but the Observe UI counts entries literally and will display "0/N selected" for an empty list. Populate explicitly to match the UI.\n' +
      '          "dimensions":  [{"name":"InstanceId","value":"i-..."}],  // optional dimension filters\n' +
      '          "tagFilters":  [{"key":"Env","values":["prod"]}]         // optional tag filters\n' +
      "        }\n" +
      "      ],\n" +
      '      "customMetricsList":            []             // same shape as awsServiceMetricsList, for non-AWS namespaces\n' +
      "    }\n" +
      "  }\n\n" +
      "  AWS poller (--type poller):\n" +
      "  {\n" +
      '    "awsMetricsPollerConfig": {\n' +
      '      "interval":                "10m",              // REQUIRED — Duration string\n' +
      '      "cloudWatchMetricsConfig": [                   // REQUIRED\n' +
      '        { "namespace": "AWS/EC2", "metricNames": ["CPUUtilization"] }   // same shape as awsServiceMetricsList entries\n' +
      "      ]\n" +
      "    }\n" +
      "  }\n\n" +
      "Use --config-file to load this from a JSON file (recommended for non-trivial\n" +
      "configs that you want to version-control or reuse across environments).\n\n" +
      "Example:\n" +
      "  observe datasource create \\\n" +
      "    --name my-aws-filedrop --connection-id <id> --datastream-id <id> --type filedrop \\\n" +
      "    --collect-logs --collect-metrics --collect-resources \\\n" +
      "    --config-file ./aws-config.json",
  },
});
