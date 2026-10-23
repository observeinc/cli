import type { Config } from "../../lib/config";
import { createApiConfiguration } from "../api-config";
import { InboundShareApi } from "./inbound-share-api";
import type { TableResource, TableUpdateRequest } from "./types";

export async function updateShareTable({
  config,
  shareId,
  tableId,
  body,
  expand,
}: {
  config: Config;
  shareId: string;
  tableId: string;
  body: TableUpdateRequest;
  expand?: boolean;
}): Promise<TableResource> {
  const api = new InboundShareApi(createApiConfiguration(config));
  return api.updateShareTable({ shareId, tableId, body, expand });
}
