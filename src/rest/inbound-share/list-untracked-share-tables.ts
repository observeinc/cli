import type { Config } from "../../lib/config";
import { createApiConfiguration } from "../api-config";
import { InboundShareApi } from "./inbound-share-api";
import type { UntrackedTableListResponse } from "./types";

export async function listUntrackedShareTables({
  config,
  shareId,
  filter,
  orderBy,
  limit,
  offset,
}: {
  config: Config;
  shareId: string;
  filter?: string;
  orderBy?: string;
  limit?: number;
  offset?: number;
}): Promise<UntrackedTableListResponse> {
  const api = new InboundShareApi(createApiConfiguration(config));
  return api.listUntrackedShareTables({
    shareId,
    filter,
    orderBy,
    limit,
    offset,
  });
}
