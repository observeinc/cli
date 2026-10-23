import type { Config } from "../../lib/config";
import { createApiConfiguration } from "../api-config";
import { InboundShareApi } from "./inbound-share-api";
import type { AttachDatasetRequest, TableResource } from "./types";

export async function attachTableDataset({
  config,
  shareId,
  tableId,
  body,
}: {
  config: Config;
  shareId: string;
  tableId: string;
  body: AttachDatasetRequest;
}): Promise<TableResource> {
  const api = new InboundShareApi(createApiConfiguration(config));
  return api.attachTableDataset({ shareId, tableId, body });
}
