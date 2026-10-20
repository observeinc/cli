import type { Config } from "../../lib/config";
import { createApiConfiguration } from "../api-config";
import { ShareInApi } from "./share-in-api";
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
  const api = new ShareInApi(createApiConfiguration(config));
  return api.getShareTable({ shareId, tableId, expand });
}
