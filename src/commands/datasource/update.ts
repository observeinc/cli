import { defineCommand } from "../../lib/stricli-wrappers";
import type { LocalContext } from "../../context.js";
import { getConnection } from "../../gql/connection/get-connection.js";
import {
  getDatasource,
  type GqlDatasource,
} from "../../gql/connection/get-datasource.js";
import { updateDatasource } from "../../gql/connection/update-datasource.js";
import { GqlApiError } from "../../gql/gql-request.js";
import { loadConfig } from "../../lib/config.js";
import type {
  AwsMetricsPollerConfigInput,
  DatasourceConfigInput,
} from "../../gql/generated/graphql.js";
import {
  AWS_MODULE_ID,
  expectedAwsDatasourceName,
} from "../../lib/aws-connection.js";
import {
  parseVariables,
  variablesToArray,
  type Variables,
} from "../../lib/connection-vars.js";
import { loadDatasourceConfig } from "../../lib/datasource-config.js";
import { parseDatasourceType } from "./parse.js";

interface UpdateDatasourceFlags {
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
  id: string,
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
    const existing = await getDatasource(config, { id });

    let userVars: Variables;
    try {
      userVars = parseVariables(flags.variables);
    } catch (e) {
      writer.error(
        `--variables: ${e instanceof Error ? e.message : String(e)}`,
      );
      process.exitCode = 1;
      return;
    }

    // Variables: start from existing, overlay the user's --variables, then
    // overlay the named --collect-* flags. Anything the user didn't touch is
    // preserved. Existing values that are null in GQL aren't meaningful as
    // input, so they're dropped.
    const mergedVars: Variables = {};
    for (const v of existing.variables) {
      if (v.value !== null) mergedVars[v.name] = v.value;
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
      process.exitCode = 1;
      return;
    }

    // The GQL response shape for `config` doesn't round-trip cleanly into
    // `DatasourceConfigInput`. We map only what the input shape can express:
    //   - `datasourceFiledropConfig` is server-managed and not in the input;
    //     omitting it is correct.
    //   - `awsCollectionStackConfig` round-trips directly.
    //   - `awsMetricsPollerConfig` reaches us as `{poller: {id, config}}`. The
    //     input shape is `{interval, cloudWatchMetricsConfig}`, so we walk into
    //     `poller.config` (queried with a PollerCloudWatchMetricsConfig
    //     fragment) and map it. The input doesn't have slots for
    //     `resourceFilter.resourceType / pattern / dimensionName`, so if any
    //     of those are populated we refuse — sending the update via ANY CLI
    //     path (implicit fall-back or explicit --config / --config-file)
    //     would silently wipe those server-side, since the input shape has
    //     no slot to round-trip them. The check fires before we even look at
    //     userConfig: the user can't avoid the data loss by supplying their
    //     own config, since their config also can't carry those fields.
    let existingInputConfig: DatasourceConfigInput | null = null;
    try {
      existingInputConfig = mapExistingConfigToInput(existing.config);
    } catch (e) {
      writer.error(e instanceof Error ? e.message : String(e));
      process.exitCode = 1;
      return;
    }

    // Same AWS-naming guard as `datasource create`: the server derives the
    // assumeRoleArn / filedrop role ARN from the datasource name, and the CFN
    // stack creates IAM roles named `<connectionName>-<suffix>`. Renaming away
    // from that convention silently breaks the deployed stack's authentication.
    const resolvedType =
      parseDatasourceType(flags.type) ?? existing.type ?? undefined;
    const newName = flags.name ?? existing.name;
    const connection = await getConnection(config, {
      id: flags.connectionId ?? existing.dataConnectionID,
    });
    if (connection.moduleID === AWS_MODULE_ID) {
      const expected = expectedAwsDatasourceName(connection.name, resolvedType);
      if (expected !== undefined && newName !== expected) {
        writer.error(
          `For AWS ${resolvedType ?? "<unknown>"} datasources, the name must be '${expected}'. The CloudFormation stack creates the IAM role with this exact name; using a different name would mean the deployed stack can't authenticate.`,
        );
        process.exitCode = 1;
        return;
      }
    }

    const datasource = await updateDatasource(config, {
      id,
      input: {
        name: newName,
        dataConnectionID: flags.connectionId ?? existing.dataConnectionID,
        datastreamID: flags.datastreamId ?? existing.datastreamID,
        type: parseDatasourceType(flags.type) ?? existing.type,
        variables: variablesToArray(mergedVars),
        clientStackAttributes: existing.clientStackAttributes,
        config: userConfig ?? existingInputConfig,
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

const SUPPORT_HINT =
  "This datasource was created with poller settings the CLI cannot " +
  "represent (custom resourceFilter resourceType / pattern / dimensionName, " +
  "or null dimension values). Updating it through the CLI would silently " +
  "drop those settings. Contact Observe support to update this datasource.";

/**
 * Map a Datasource GQL response into the input shape used by updateDatasource.
 * Throws when the existing config has fields the input shape can't express,
 * so the caller refuses the update rather than silently dropping data.
 */
function mapExistingConfigToInput(
  existingConfig: GqlDatasource["config"],
): DatasourceConfigInput | null {
  if (!existingConfig) return null;

  const stackCfg = existingConfig.awsCollectionStackConfig ?? undefined;
  const pollerWrapper = existingConfig.awsMetricsPollerConfig ?? undefined;

  let pollerInput: AwsMetricsPollerConfigInput | undefined;
  if (pollerWrapper) {
    const pollerCfg = pollerWrapper.poller.config;
    // The fragment selects PollerCloudWatchMetricsConfig fields; for any other
    // PollerConfig variant the codegen returns Record<PropertyKey, never>, so
    // 'queries' is the discriminator.
    if (!("queries" in pollerCfg)) {
      throw new Error(SUPPORT_HINT);
    }
    pollerInput = {
      interval: pollerCfg.interval ?? "",
      cloudWatchMetricsConfig: pollerCfg.queries.map((q) => {
        const rf = q.resourceFilter;
        if (rf && (rf.resourceType || rf.pattern || rf.dimensionName)) {
          throw new Error(SUPPORT_HINT);
        }
        const dimensions = (q.dimensions ?? []).map((d) => {
          if (d.value === null) throw new Error(SUPPORT_HINT);
          return { name: d.name, value: d.value };
        });
        const tagFilters = (rf?.tagFilters ?? []).map((tf) => ({
          key: tf.key,
          values: tf.values ?? [],
        }));
        return {
          namespace: q.namespace,
          metricNames: q.metricNames ?? [],
          dimensions,
          tagFilters,
        };
      }),
    };
  }

  if (!stackCfg && !pollerInput) return null;
  return {
    ...(stackCfg ? { awsCollectionStackConfig: stackCfg } : {}),
    ...(pollerInput ? { awsMetricsPollerConfig: pollerInput } : {}),
  };
}

export const updateDatasourceCommand = defineCommand({
  experimental: true,
  loader: async () => updateDatasourceCmd,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        {
          placeholder: "datasourceId",
          brief: "Datasource ID to update",
          parse: String,
        },
      ],
    },
    flags: {
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
      "Use 'observe data-connection view <id>' to find datasource IDs.\n\n" +
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
      "Use --config-file to load this from a JSON file.\n\n" +
      "Example:\n" +
      "  observe datasource update <datasource-id> \\\n" +
      "    --name my-aws-filedrop \\\n" +
      "    --connection-id <id> --datastream-id <id> --type filedrop \\\n" +
      "    --collect-logs --collect-metrics --collect-resources \\\n" +
      "    --config-file ./aws-config.json",
  },
});
