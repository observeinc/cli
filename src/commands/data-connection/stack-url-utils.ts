const CF_TEMPLATE_URL = (region: string) =>
  `https://observeinc-${region}.s3.${region}.amazonaws.com/aws-sam-apps/latest/stack.yaml`;

interface CloudFormationParams {
  region: string;
  stackName: string;
  dataAccessPointArn: string;
  destinationUri: string;
  includeResourceTypes: string;
  logGroupNamePatterns: string;
  excludeLogGroupNamePatterns: string;
  sourceBucketNames: string;
  configDeliveryBucketName: string;
  metricStreamFilterUri: string;
  observeAccountId: string;
  observeDomainName: string;
  datasourceId: string;
  gqlToken: string;
  updateTimestamp: string;
  observeAwsAccountId: string;
  datastreamIds: string;
}

const CF_PARAM_KEYS: Record<
  keyof Omit<CloudFormationParams, "region" | "stackName">,
  string
> = {
  dataAccessPointArn: "DataAccessPointArn",
  destinationUri: "DestinationUri",
  includeResourceTypes: "IncludeResourceTypes",
  logGroupNamePatterns: "LogGroupNamePatterns",
  excludeLogGroupNamePatterns: "ExcludeLogGroupNamePatterns",
  sourceBucketNames: "SourceBucketNames",
  configDeliveryBucketName: "ConfigDeliveryBucketName",
  metricStreamFilterUri: "MetricStreamFilterUri",
  observeAccountId: "ObserveAccountID",
  observeDomainName: "ObserveDomainName",
  datasourceId: "DatasourceID",
  gqlToken: "GQLToken",
  updateTimestamp: "UpdateTimestamp",
  observeAwsAccountId: "ObserveAwsAccountId",
  datastreamIds: "DatastreamIds",
};

export function buildCloudFormationUrl(params: CloudFormationParams): string {
  const { region, stackName, ...rest } = params;
  const templateUrl = CF_TEMPLATE_URL(region);
  const queryParams = (Object.entries(rest) as [keyof typeof rest, string][])
    .map(([k, v]) => `param_${CF_PARAM_KEYS[k]}=${encodeURIComponent(v)}`)
    .join("&");
  return (
    `https://${region}.console.aws.amazon.com/cloudformation/home` +
    `#/stacks/create/review?region=${region}` +
    `&templateURL=${encodeURIComponent(templateUrl)}` +
    `&stackName=${encodeURIComponent(stackName)}` +
    `&${queryParams}`
  );
}
