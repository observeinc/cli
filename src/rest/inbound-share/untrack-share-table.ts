import type { Config } from "../../lib/config";
import { createApiConfiguration } from "../api-config";
import { InboundShareApi } from "./inbound-share-api";

export async function untrackShareTable({
  config,
  shareId,
  tableId,
}: {
  config: Config;
  shareId: string;
  tableId: string;
}): Promise<void> {
  const api = new InboundShareApi(createApiConfiguration(config));
  await api.untrackShareTable({ shareId, tableId });
}
