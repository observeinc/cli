import type { Config } from "../../lib/config";
import { createApiConfiguration } from "../api-config";
import { InboundShareApi } from "./inbound-share-api";
import type { HealthStatus, ShareListResponse, ShareState } from "./types";

export async function listShares({
  config,
  status,
  healthStatus,
  orderBy,
  limit,
  offset,
}: {
  config: Config;
  status?: ShareState;
  healthStatus?: HealthStatus;
  orderBy?: string;
  limit?: number;
  offset?: number;
}): Promise<ShareListResponse> {
  const api = new InboundShareApi(createApiConfiguration(config));
  return api.listShares({ status, healthStatus, orderBy, limit, offset });
}
