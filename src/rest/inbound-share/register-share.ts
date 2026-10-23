import type { Config } from "../../lib/config";
import { createApiConfiguration } from "../api-config";
import { InboundShareApi } from "./inbound-share-api";
import type { RegisterShareRequest, ShareResource } from "./types";

export async function registerShare({
  config,
  body,
}: {
  config: Config;
  body: RegisterShareRequest;
}): Promise<{ share: ShareResource; created: boolean }> {
  const api = new InboundShareApi(createApiConfiguration(config));
  return api.registerShare(body);
}
