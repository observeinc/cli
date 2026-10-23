import type { Config } from "../../lib/config";
import { createApiConfiguration } from "../api-config";
import { InboundShareApi } from "./inbound-share-api";
import type { TableResource } from "./types";

export async function getShareTable({
  config,
  shareId,
  tableId,
  expand,
}: {
  config: Config;
  shareId: string;
  tableId: string;
  expand?: boolean;
}): Promise<TableResource> {
  const api = new InboundShareApi(createApiConfiguration(config));
  return api.getShareTable({ shareId, tableId, expand });
}
