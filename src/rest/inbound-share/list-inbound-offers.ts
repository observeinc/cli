import type { Config } from "../../lib/config";
import type { ExternalSharesInboundOfferListResponse } from "../generated";
import { ObserveRestSDK } from "../client";

export async function listInboundOffers({
  config,
  limit,
  offset,
}: {
  config: Config;
  limit?: number;
  offset?: number;
}): Promise<ExternalSharesInboundOfferListResponse> {
  const sdk = new ObserveRestSDK(config);
  return sdk.externalSharesApi.listInboundOffers({ limit, offset });
}
