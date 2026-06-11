import { buildCommand } from "@stricli/core";
import type { LocalContext } from "../../context.js";
import { loadConfig } from "../../lib/config.js";
import { getDatasource } from "../../gql/connection/get-datasource.js";
import { GqlApiError } from "../../gql/gql-request.js";
import { buildCloudFormationUrl } from "./stack-url-utils.js";

interface CreateStackUrlFlags {
  region: string;
  stackName: string;
  id?: string;
  dataAccessPointArn?: string;
  destinationUri?: string;
  observeAccountId?: string;
  observeDomain?: string;
  datasourceId?: string;
  gqlToken?: string;
  includeResources?: boolean;
  logGroups?: string;
  excludeLogGroups?: string;
  sourceBuckets?: string;
  configDeliveryBucket?: string;
  metricsMode?: string;
  datastreamId?: string;
  observeAwsAccountId?: string;
}

export interface GenerateStackUrlDeps {
  loadConfig?: typeof loadConfig;
}

export async function generateStackUrl(
  this: LocalContext,
  flags: CreateStackUrlFlags,
  deps: GenerateStackUrlDeps = {},
): Promise<void> {
  const { loadConfig: loadConfigImpl = loadConfig } = deps;
  const { process, writer } = this;

  try {
    const isPollerMode = flags.metricsMode === "poller";

    // Validate input combinations.
    if (flags.id !== undefined) {
      if (
        flags.dataAccessPointArn !== undefined ||
        flags.destinationUri !== undefined
      ) {
        writer.error(
          "--id is mutually exclusive with --data-access-point-arn / --destination-uri",
        );
        process.exit(1);
        return;
      }
    } else if (
      flags.dataAccessPointArn === undefined ||
      flags.destinationUri === undefined
    ) {
      writer.error(
        "Provide either --id <datasource-id> (auto-fetch) or both --data-access-point-arn and --destination-uri",
      );
      process.exit(1);
      return;
    }

    // Load config for push-mode auto-fill (account ID, domain, token).
    let configAccountId: string | undefined;
    let configDomain: string | undefined;
    let configToken: string | undefined;
    let needConfig = false;
    if (
      !isPollerMode &&
      (flags.observeAccountId === undefined ||
        flags.observeDomain === undefined ||
        flags.gqlToken === undefined)
    ) {
      needConfig = true;
    }
    if (flags.id !== undefined) needConfig = true;

    let config;
    if (needConfig) {
      try {
        config = loadConfigImpl();
        configAccountId = config.customerId;
        configDomain = `${config.domain}.com`;
        configToken = config.token;
      } catch (e) {
        if (flags.id !== undefined) {
          writer.error(
            "--id requires authenticated config (run 'observe auth login' first)",
          );
          process.exit(1);
          return;
        }
        // Fall through; explicit flags must cover everything.
        void e;
      }
    }

    // Auto-fetch datasource ARN/URI if --id given.
    let dataAccessPointArn = flags.dataAccessPointArn;
    let destinationUri = flags.destinationUri;
    let resolvedDatasourceId = flags.datasourceId ?? flags.id;
    if (flags.id !== undefined && config !== undefined) {
      const ds = await getDatasource(config, { id: flags.id });
      const filedropCfg = ds.config?.datasourceFiledropConfig;
      if (!filedropCfg) {
        writer.error(
          `Datasource ${flags.id} has no filedrop config — only filedrop datasources have stack URLs`,
        );
        process.exit(1);
        return;
      }
      dataAccessPointArn = filedropCfg.dataAccessPointArn;
      destinationUri = filedropCfg.destinationUri;
      resolvedDatasourceId = flags.datasourceId ?? ds.id;
    }

    const url = buildCloudFormationUrl({
      region: flags.region,
      stackName: flags.stackName,
      dataAccessPointArn: dataAccessPointArn ?? "",
      destinationUri: destinationUri ?? "",
      includeResourceTypes: flags.includeResources ? "*" : "",
      logGroupNamePatterns: flags.logGroups ?? "",
      excludeLogGroupNamePatterns: flags.excludeLogGroups ?? "",
      sourceBucketNames: flags.sourceBuckets ?? "",
      configDeliveryBucketName: flags.configDeliveryBucket ?? "",
      observeAccountId: isPollerMode
        ? ""
        : (flags.observeAccountId ?? configAccountId ?? ""),
      observeDomainName: isPollerMode
        ? ""
        : (flags.observeDomain ?? configDomain ?? ""),
      datasourceId: isPollerMode ? "" : (resolvedDatasourceId ?? ""),
      gqlToken: isPollerMode ? "" : (flags.gqlToken ?? configToken ?? ""),
      updateTimestamp: isPollerMode
        ? ""
        : Math.floor(Date.now() / 1000).toString(),
      observeAwsAccountId: isPollerMode
        ? (flags.observeAwsAccountId ?? "")
        : "",
      datastreamIds: isPollerMode ? (flags.datastreamId ?? "") : "",
    });

    writer.write(url);
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

export const generateStackUrlCommand = buildCommand({
  loader: async () => generateStackUrl,
  parameters: {
    positional: { kind: "tuple", parameters: [] },
    flags: {
      region: {
        kind: "parsed",
        parse: String,
        brief: "AWS region (e.g. us-west-2)",
        optional: false,
      },
      stackName: {
        kind: "parsed",
        parse: String,
        brief: "CloudFormation stack name (customer-chosen)",
        optional: false,
      },
      id: {
        kind: "parsed",
        parse: String,
        brief:
          "Datasource ID to look up. The CLI fetches the datasource via GraphQL and reads its dataAccessPointArn / destinationUri. Mutually exclusive with --data-access-point-arn and --destination-uri.",
        optional: true,
      },
      dataAccessPointArn: {
        kind: "parsed",
        parse: String,
        brief:
          "Data access point ARN (use when not passing --id). From the filedrop datasource output.",
        optional: true,
      },
      destinationUri: {
        kind: "parsed",
        parse: String,
        brief:
          "Destination URI (use when not passing --id). From the filedrop datasource output.",
        optional: true,
      },
      observeAccountId: {
        kind: "parsed",
        parse: String,
        brief:
          "Observe account/customer ID (push mode). Defaults to the config's customerId.",
        optional: true,
      },
      observeDomain: {
        kind: "parsed",
        parse: String,
        brief:
          "Observe domain (push mode), full hostname suffix e.g. observe-eng.com. Defaults to the config's domain (with .com appended).",
        optional: true,
      },
      datasourceId: {
        kind: "parsed",
        parse: String,
        brief:
          "Datasource ID for metrics push mode (defaults to --id if provided)",
        optional: true,
      },
      gqlToken: {
        kind: "parsed",
        parse: String,
        brief: "GQL auth token (push mode). Defaults to the config's token.",
        optional: true,
      },
      includeResources: {
        kind: "boolean",
        brief: "Include AWS resource collection via AWS Config",
        optional: true,
      },
      logGroups: {
        kind: "parsed",
        parse: String,
        brief: "Comma-separated log group names",
        optional: true,
      },
      excludeLogGroups: {
        kind: "parsed",
        parse: String,
        brief: "Comma-separated log group names to exclude",
        optional: true,
      },
      sourceBuckets: {
        kind: "parsed",
        parse: String,
        brief: "Comma-separated S3 bucket names to forward",
        optional: true,
      },
      configDeliveryBucket: {
        kind: "parsed",
        parse: String,
        brief: "Existing AWS Config delivery bucket",
        optional: true,
      },
      metricsMode: {
        kind: "enum",
        values: ["push", "poller"],
        brief: "Metrics mode (default: push)",
        optional: true,
      },
      datastreamId: {
        kind: "parsed",
        parse: String,
        brief: "Datastream ID (poller mode)",
        optional: true,
      },
      observeAwsAccountId: {
        kind: "parsed",
        parse: String,
        brief: "Observe AWS account ID (poller mode)",
        optional: true,
      },
    },
  },
  docs: {
    brief:
      "Generate a CloudFormation quick-create URL for a filedrop datasource",
    fullDescription:
      "Builds the CloudFormation quick-create URL that deploys the AWS collection\n" +
      "stack for a filedrop datasource.\n\n" +
      "Two modes:\n" +
      "  1. --id <datasource-id> — the CLI fetches the datasource via GraphQL\n" +
      "     and reads its dataAccessPointArn / destinationUri (recommended).\n" +
      "  2. --data-access-point-arn + --destination-uri — pass both explicitly\n" +
      "     (legacy; useful when offline or for scripting).\n\n" +
      "In push mode (default), --observe-account-id, --observe-domain, and\n" +
      "--gql-token auto-load from ~/.observe/config.json.\n\n" +
      "Example:\n" +
      "  observe datasource generate-stack-url \\\n" +
      "    --id <datasource-id> --region us-west-2 --stack-name my-aws",
  },
});
