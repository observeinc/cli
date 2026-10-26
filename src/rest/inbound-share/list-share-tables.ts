import type { Config } from "../../lib/config";
import type { ExternalSharesTableListResponse } from "../generated";
import { ObserveRestSDK } from "../client";

export async function listShareTables({
  config,
  shareId,
  filter,
  orderBy,
  limit,
  offset,
  expand,
}: {
  config: Config;
  shareId: string;
  filter?: string;
  orderBy?: string;
  limit?: number;
  offset?: number;
  expand?: boolean;
}): Promise<ExternalSharesTableListResponse> {
  const sdk = new ObserveRestSDK(config);
  return sdk.externalSharesApi.listShareTables({
    shareId,
    filter,
    orderBy,
    limit,
    offset,
    expand,
  });
}
