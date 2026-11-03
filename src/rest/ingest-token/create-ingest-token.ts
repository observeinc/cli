import type { Config } from "../../lib/config";
import type { IngestTokenCreateRequest } from "../generated";
import { ObserveRestSDK } from "../client";

export async function createIngestToken({
  config,
  ingestTokenCreateRequest,
}: {
  config: Config;
  ingestTokenCreateRequest: IngestTokenCreateRequest;
}) {
  const sdk = new ObserveRestSDK(config);
  return sdk.ingestTokensApi.createIngestToken({ ingestTokenCreateRequest });
}
