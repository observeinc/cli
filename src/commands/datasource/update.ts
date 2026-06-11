import { buildCommand } from "@stricli/core";
import type { LocalContext } from "../../context.js";
import { getDatasource } from "../../gql/connection/get-datasource.js";
import { updateDatasource } from "../../gql/connection/update-datasource.js";
import { GqlApiError } from "../../gql/gql-request.js";
import { loadConfig } from "../../lib/config.js";
import type { DatasourceConfigInput } from "../../gql/generated/graphql.js";
import {
  parseVariables,
  variablesToArray,
  type Variables,
} from "../../lib/connection-vars.js";
import { loadDatasourceConfig } from "../../lib/datasource-config.js";
import { parseDatasourceType } from "./parse.js";

interface UpdateDatasourceFlags {
  id: string;
  name?: string;
  connectionId?: string;
  datastreamId?: string;
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

export async function updateDatasourceCmd(
  this: LocalContext,
  flags: UpdateDatasourceFlags,
  deps: UpdateDatasourceDeps = {},
): Promise<void> {
  const { loadConfig: loadConfigImpl = loadConfig } = deps;
  const { process, writer } = this;

  try {
    const config = loadConfigImpl();

    // Read-modify-write: fetch the existing datasource so we can merge the
    // user's flags on top and send a complete input. The GQL UpdateDatasource
    // mutation does full replacement server-side (any field omitted from the
    // input is clobbered to its zero value), so partial-update UX has to be
    // synthesized at the CLI layer. This matches the partial-update semantics
    // Observe's REST PATCH endpoints expose to callers.
    const existing = await getDatasource(config, { id: flags.id });
    if (!existing) {
      writer.error(`Datasource not found: ${flags.id}`);
      process.exit(1);
      return;
    }

    let userVars: Variables;
    try {
      userVars = parseVariables(flags.variables);
    } catch (e) {
      writer.error(
        `--variables: ${e instanceof Error ? e.message : String(e)}`,
      );
      process.exit(1);
      return;
    }

    // Variables: start from existing, overlay the user's --variables, then
    // overlay the named --collect-* flags. Anything the user didn't touch is
    // preserved.
    const mergedVars: Variables = {};
    for (const v of existing.variables ?? []) {
      mergedVars[v.name] = v.value;
    }
    for (const [k, v] of Object.entries(userVars)) {
      mergedVars[k] = v;
    }
    if (flags.collectLogs !== undefined)
      mergedVars.collect_logs = String(flags.collectLogs);
    if (flags.collectMetrics !== undefined)
      mergedVars.collect_metrics = String(flags.collectMetrics);
    if (flags.collectResources !== undefined)
      mergedVars.collect_resource_info = String(flags.collectResources);

    let userConfig: DatasourceConfigInput | undefined;
    try {
      userConfig = loadDatasourceConfig(flags.config, flags.configFile);
    } catch (e) {
      writer.error(e instanceof Error ? e.message : String(e));
      process.exit(1);
      return;
    }

    const datasource = await updateDatasource(config, {
      id: flags.id,
      input: {
        name: flags.name ?? existing.name,
        dataConnectionID: flags.connectionId ?? existing.dataConnectionID,
        datastreamID: flags.datastreamId ?? existing.datastreamID,
        type: parseDatasourceType(flags.type) ?? existing.type,
        variables: variablesToArray(mergedVars),
        clientStackAttributes: existing.clientStackAttributes ?? [],
        config: userConfig ?? existing.config,
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
        brief: "Datasource name (only updated if provided)",
        optional: true,
      },
      connectionId: {
        kind: "parsed",
        parse: String,
        brief: "ID of the parent data connection (only updated if provided)",
        optional: true,
      },
      datastreamId: {
        kind: "parsed",
        parse: String,
        brief:
          "Datastream ID associated with this datasource (only updated if provided)",
        optional: true,
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
