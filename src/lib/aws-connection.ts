import { DatasourceType } from "../gql/generated/graphql.js";

export const AWS_MODULE_ID = "observeinc/connection/aws";

// AWS connection convention. The CFN stack created by
// `data-connection generate-stack-url` builds the per-datasource IAM role
// name as `${StackName}-<suffix>`, and the server (gql_datasource.go) derives
// each datasource's assumeRoleArn from the *datasource name*. So if the
// datasource isn't named `<connectionName>-<suffix>` (and the user follows
// the standard convention of using the connection name as the stack name),
// AWS will reject the AssumeRole call. The CLI enforces the suffix to keep
// the two ends in sync.
export const AWS_FILEDROP_SUFFIX = "filedrop";
export const AWS_METRICS_POLLER_SUFFIX = "metrics-poller";

export function awsDatasourceSuffix(
  type: DatasourceType | undefined,
): string | undefined {
  if (type === DatasourceType.Filedrop) return AWS_FILEDROP_SUFFIX;
  if (type === DatasourceType.Poller) return AWS_METRICS_POLLER_SUFFIX;
  return undefined;
}

export function expectedAwsDatasourceName(
  connectionName: string,
  type: DatasourceType | undefined,
): string | undefined {
  const suffix = awsDatasourceSuffix(type);
  return suffix === undefined ? undefined : `${connectionName}-${suffix}`;
}
