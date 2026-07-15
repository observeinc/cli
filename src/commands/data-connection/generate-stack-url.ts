import { defineCommand } from "../../lib/stricli-wrappers";
import type { LocalContext } from "../../context.js";
import { getCloudInfo } from "../../gql/customer/get-cloud-info.js";
import { getConnection } from "../../gql/connection/get-connection.js";
import { DatasourceType } from "../../gql/generated/graphql.js";
import { GqlApiError } from "../../gql/gql-request.js";
import { loadConfig } from "../../lib/config.js";
import { buildCloudFormationUrl } from "./stack-url-utils.js";

interface GenerateStackUrlFlags {
  stackName?: string;
  region?: string;
}

export interface GenerateStackUrlDeps {
  loadConfig?: typeof loadConfig;
}

// Variable name set by the AWS connection module — keep in sync with
// data-connection/create/aws.ts.
const VAR_ACCOUNT_REGION = "account_region";

function findVariable(
  vars: { name: string; value: string | null }[],
  name: string,
): string | undefined {
  return vars.find((v) => v.name === name)?.value ?? undefined;
}

export async function generateStackUrlCmd(
  this: LocalContext,
  flags: GenerateStackUrlFlags,
  id: string,
  deps: GenerateStackUrlDeps = {},
): Promise<void> {
  const { loadConfig: loadConfigImpl = loadConfig } = deps;
  const { process, writer } = this;

  try {
    const config = loadConfigImpl();
    const connection = await getConnection(config, { id });

    // The CFN stack creates IAM roles named `${StackName}-filedrop` and
    // `${StackName}-metrics-poller`. The server derives each datasource's
    // assumeRoleArn from the *datasource name*, which `datasource create`
    // pins to `<connectionName>-<suffix>`. So `StackName` must equal
    // `connectionName` for the two ends to line up. Default it; refuse a
    // mismatched explicit value rather than letting the user deploy a stack
    // that can't authenticate.
    const stackName = flags.stackName ?? connection.name;
    if (flags.stackName !== undefined && flags.stackName !== connection.name) {
      writer.error(
        `--stack-name must match the connection name '${connection.name}' (or omit --stack-name to default to it). The CloudFormation stack creates IAM roles using the stack name; using a different name would mean the deployed stack can't authenticate against the datasources.`,
      );
      process.exitCode = 1;
      return;
    }

    const region =
      flags.region ?? findVariable(connection.variables, VAR_ACCOUNT_REGION);
    if (!region) {
      writer.error(
        `Connection ${id} has no '${VAR_ACCOUNT_REGION}' variable; pass --region explicitly`,
      );
      process.exitCode = 1;
      return;
    }

    // Walk the connection's datasources. AWS connections produce a Filedrop
    // datasource (logs/metric-stream/config) and optionally a Poller datasource
    // (poller-mode metrics). Both can co-exist on the same stack.
    const filedropDs = connection.datasources.find(
      (d) => d.type === DatasourceType.Filedrop,
    );
    const pollerDs = connection.datasources.find(
      (d) => d.type === DatasourceType.Poller,
    );

    if (!filedropDs && !pollerDs) {
      writer.error(
        `Connection ${id} has no Filedrop or Poller datasource; create one with 'observe datasource create' first`,
      );
      process.exitCode = 1;
      return;
    }

    const filedropCfg = filedropDs?.config?.datasourceFiledropConfig;
    const stackCfg = filedropDs?.config?.awsCollectionStackConfig;

    // Push-mode params (filedrop side) need Observe's domain/customer/token so
    // the deployed stack can call back into the metadata API.
    if (filedropDs && !filedropCfg) {
      writer.error(
        `Filedrop datasource ${filedropDs.id} is missing datasourceFiledropConfig; cannot build stack URL`,
      );
      process.exitCode = 1;
      return;
    }

    // Poller-mode params need Observe's *own* AWS account ID for the IAM trust
    // policy. The webapp pulls this from currentCustomer.cloudInfo too.
    let observeAwsAccountId = "";
    if (pollerDs) {
      const cloudInfo = await getCloudInfo(config);
      if (!cloudInfo?.accountId) {
        writer.error(
          "Could not determine Observe AWS account ID from currentCustomer.cloudInfo; cannot build poller stack URL",
        );
        process.exitCode = 1;
        return;
      }
      observeAwsAccountId = cloudInfo.accountId;
    }

    const pushModeActive = filedropDs !== undefined;
    // The CFN stack's MetricStream substack deploys when the
    // EnableMetricStream condition is true: MetricStreamFilterUri != "" OR
    // DatasourceID != "". The metricsconfigurator Lambda then either
    //   (a) reads the datasource's awsServiceMetricsList /
    //       customMetricsList and uses them as CloudWatch IncludeFilters
    //       (DatasourceID path), or
    //   (b) downloads a YAML filter file from MetricStreamFilterUri and
    //       uses that (FilterUri path).
    //
    // The template's MetricStreamFilterUri default is non-empty
    // (`s3://observeinc/cloudwatchmetrics/filters/recommended.yaml`), which
    // means MetricStream deploys *unconditionally* unless we override it
    // here. And if the user only configured poller-mode metrics, neither
    // path is what they want. So we override MetricStreamFilterUri to ""
    // and only set DatasourceID when the filedrop has metrics to stream;
    // both empty makes the substack skip entirely.
    const enableMetricStream =
      pushModeActive &&
      ((stackCfg?.awsServiceMetricsList ?? []).length > 0 ||
        (stackCfg?.customMetricsList ?? []).length > 0);
    const url = buildCloudFormationUrl({
      region,
      stackName,
      dataAccessPointArn: filedropCfg?.dataAccessPointArn ?? "",
      destinationUri: filedropCfg?.destinationUri ?? "",
      includeResourceTypes: (stackCfg?.configResourceList ?? []).join(","),
      logGroupNamePatterns: (stackCfg?.logGroupNamePatterns ?? []).join(","),
      excludeLogGroupNamePatterns: (
        stackCfg?.excludeLogGroupNamePatterns ?? []
      ).join(","),
      sourceBucketNames: (stackCfg?.sourceBucketNames ?? []).join(","),
      configDeliveryBucketName: stackCfg?.configDeliveryBucketName ?? "",
      // Always override the CFN default; CLI users have a datasource and
      // don't want the FilterUri-based fallback. When DatasourceID is also
      // empty, the substack skips deployment entirely.
      metricStreamFilterUri: "",
      observeAccountId: enableMetricStream ? config.customerId : "",
      observeDomainName: enableMetricStream ? `${config.domain}.com` : "",
      datasourceId: enableMetricStream ? filedropDs.id : "",
      gqlToken: enableMetricStream ? config.token : "",
      updateTimestamp: enableMetricStream
        ? Math.floor(Date.now() / 1000).toString()
        : "",
      observeAwsAccountId,
      datastreamIds: pollerDs ? pollerDs.datastreamID : "",
    });

    writer.write(url);
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

export const generateStackUrlCommand = defineCommand({
  experimental: true,
  loader: async () => generateStackUrlCmd,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        {
          brief: "Data connection ID",
          parse: String,
        },
      ],
    },
    flags: {
      stackName: {
        kind: "parsed",
        parse: String,
        brief:
          "CloudFormation stack name. Optional; defaults to the connection name. If supplied, must equal the connection name (the IAM roles created by the stack are keyed off the stack name and have to match the datasources' names server-side).",
        optional: true,
      },
      region: {
        kind: "parsed",
        parse: String,
        brief:
          "AWS region override. Defaults to the connection's account_region variable.",
        optional: true,
      },
    },
  },
  docs: {
    brief:
      "Generate a CloudFormation quick-create URL for a data connection's AWS stack",
    fullDescription:
      "Builds the CloudFormation quick-create URL that deploys the AWS collection\n" +
      "stack for a data connection. The CLI reads the connection's variables and\n" +
      "datasources to populate every parameter, so passing the connection ID is\n" +
      "usually all that's needed.\n\n" +
      "The connection must have at least one Filedrop or Poller datasource. If\n" +
      "both are present, the URL drives a single stack that runs filedrop +\n" +
      "poller collection together.\n\n" +
      "Example:\n" +
      "  observe data-connection generate-stack-url <conn-id>",
  },
});
