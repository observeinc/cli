import type { Config } from "../../lib/config";
import { createApiConfiguration } from "../api-config";
import { InboundShareApi } from "./inbound-share-api";
import type { TableListResponse } from "./types";

export async function listAllTrackedTables({
  config,
  filter,
  orderBy,
  limit,
  offset,
  expand,
}: {
  config: Config;
  filter?: string;
  orderBy?: string;
  limit?: number;
  offset?: number;
  expand?: boolean;
}): Promise<TableListResponse> {
  const api = new InboundShareApi(createApiConfiguration(config));
  return api.listAllTrackedTables({ filter, orderBy, limit, offset, expand });
}
