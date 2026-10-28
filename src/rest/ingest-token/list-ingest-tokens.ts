import type { Config } from "../../lib/config";
import type { IngestTokensApiListIngestTokensRequest } from "../generated";
import { ObserveRestSDK } from "../client";

export async function listIngestTokens({
  config,
  ...params
}: { config: Config } & IngestTokensApiListIngestTokensRequest) {
  const sdk = new ObserveRestSDK(config);
  return sdk.ingestTokensApi.listIngestTokens(params);
}
