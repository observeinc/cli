import type { Config } from "../../lib/config";
import { createApiConfiguration } from "../api-config";
import { InboundShareApi } from "./inbound-share-api";
import type { ShareResource } from "./types";

export async function getShare({
  config,
  shareId,
}: {
  config: Config;
  shareId: string;
}): Promise<ShareResource> {
  const api = new InboundShareApi(createApiConfiguration(config));
  return api.getShare({ shareId });
}
