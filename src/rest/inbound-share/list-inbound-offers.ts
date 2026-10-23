import type { Config } from "../../lib/config";
import { createApiConfiguration } from "../api-config";
import { InboundShareApi } from "./inbound-share-api";
import type { InboundOfferListResponse } from "./types";

export async function listInboundOffers({
  config,
  limit,
  offset,
}: {
  config: Config;
  limit?: number;
  offset?: number;
}): Promise<InboundOfferListResponse> {
  const api = new InboundShareApi(createApiConfiguration(config));
  return api.listInboundOffers({ limit, offset });
}
