import { buildCommand } from "@stricli/core";
import type { LocalContext } from "../../context.js";
import { updateDatasource } from "../../gql/connection/update-datasource.js";
import { GqlApiError } from "../../gql/gql-request.js";
import { loadConfig } from "../../lib/config.js";
import type { DatasourceConfigInput } from "../../gql/generated/graphql.js";
import { DatasourceType } from "../../gql/generated/graphql.js";
import { parseVariables, variablesToArray } from "../../lib/connection-vars.js";
import { loadDatasourceConfig } from "../../lib/datasource-config.js";

interface UpdateDatasourceFlags {
  id: string;
  name: string;
  connectionId: string;
  datastreamId: string;
  type?: string;
  variables?: string;
  config?: string;
  configFile?: string;
  collectLogs?: boolean;
  collectMetrics?: boolean;
  collectResources?: boolean;
}

export interface UpdateDatasourceDeps {
  loadConfig?: typeof loadConfig;
}

function parseDatasourceType(
  value: string | undefined,
): DatasourceType | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  if (upper === "FILEDROP") return DatasourceType.Filedrop;
  if (upper === "POLLER") return DatasourceType.Poller;
  return value as DatasourceType;
}

export async function updateDatasourceCmd(
  this: LocalContext,
  flags: UpdateDatasourceFlags,
  deps: UpdateDatasourceDeps = {},
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
      process.exit(1);
      return;
    }

    const datasource = await updateDatasource(config, {
      id: flags.id,
      input: {
        name: flags.name,
        dataConnectionID: flags.connectionId,
        datastreamID: flags.datastreamId,
        type: parseDatasourceType(flags.type),
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
    process.exit(1);
  }
}

export const updateDatasourceCommand = buildCommand({
  loader: async () => updateDatasourceCmd,
  parameters: {
    positional: { kind: "tuple", parameters: [] },
    flags: {
      id: {
        kind: "parsed",
        parse: String,
        brief: "ID of the datasource to update",
        optional: false,
      },
      name: {
        kind: "parsed",
        parse: String,
        brief: "Datasource name",
        optional: false,
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
        brief: "Datastream ID associated with this datasource",
        optional: false,
      },
      type: {
        kind: "parsed",
        parse: String,
        brief: "Datasource type (e.g. filedrop, poller)",
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
          "Updated datasource config as a JSON object. For AWS, awsCollectionStackConfig.awsServiceMetricsList drives the AWS::CloudWatch::MetricStream resources created by the CloudFormation stack. Mutually exclusive with --config-file.",
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
    brief: "Update an existing datasource",
    fullDescription:
      "Updates the configuration of an existing datasource.\n\n" +
      "Use 'observe data-connection view --name <name>' to find datasource IDs.\n\n" +
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
      '          "metricNames": ["CPUUtilization"],         // optional — omit / [] means all metrics in the namespace\n' +
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
      "Use --config-file to load this from a JSON file.\n\n" +
      "Example:\n" +
      "  observe datasource update \\\n" +
      "    --id <datasource-id> --name my-aws-filedrop \\\n" +
      "    --connection-id <id> --datastream-id <id> --type filedrop \\\n" +
      "    --collect-logs --collect-metrics --collect-resources \\\n" +
      "    --config-file ./aws-config.json",
  },
});
