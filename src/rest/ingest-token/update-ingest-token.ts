import type { Config } from "../../lib/config";
import type { IngestTokenUpdateRequest } from "../generated";
import { ObserveRestSDK } from "../client";

export async function updateIngestToken({
  config,
  id,
  ingestTokenUpdateRequest,
}: {
  config: Config;
  id: string;
  ingestTokenUpdateRequest: IngestTokenUpdateRequest;
}) {
  const sdk = new ObserveRestSDK(config);
  return sdk.ingestTokensApi.updateIngestToken({
    id,
    ingestTokenUpdateRequest,
  });
}
