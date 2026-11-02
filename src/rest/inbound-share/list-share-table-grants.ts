import type { Config } from "../../lib/config";
import type { ExternalSharesTableGrantListResponse } from "../generated";
import { ObserveRestSDK } from "../client";

export async function listShareTableGrants({
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
}): Promise<ExternalSharesTableGrantListResponse> {
  const sdk = new ObserveRestSDK(config);
  return sdk.externalSharesApi.listShareTableGrants({
    shareId,
    filter,
    orderBy,
    limit,
    offset,
  });
}
