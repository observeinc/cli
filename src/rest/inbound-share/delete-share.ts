import type { Config } from "../../lib/config";
import { createApiConfiguration } from "../api-config";
import { InboundShareApi } from "./inbound-share-api";

export async function deleteShare({
  config,
  shareId,
  force,
}: {
  config: Config;
  shareId: string;
  force?: boolean;
}): Promise<void> {
  const api = new InboundShareApi(createApiConfiguration(config));
  await api.deleteShare({ shareId, force });
}
