import type { Config } from "../../lib/config";
import { createApiConfiguration } from "../api-config";
import { ShareInApi } from "./share-in-api";
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
  const api = new ShareInApi(createApiConfiguration(config));
  return api.updateShareTable({ shareId, tableId, body, expand });
}
