import type { Config } from "../../lib/config";
import { createApiConfiguration } from "../api-config";
import { ShareInApi } from "./share-in-api";
import type { TableResource, TrackTableRequest } from "./types";

export async function trackShareTable({
  config,
  shareId,
  body,
  expand,
}: {
  config: Config;
  shareId: string;
  body: TrackTableRequest;
  expand?: boolean;
}): Promise<{ table: TableResource; created: boolean }> {
  const api = new ShareInApi(createApiConfiguration(config));
  return api.trackShareTable({ shareId, body, expand });
}
