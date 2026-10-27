import type { Config } from "../../lib/config";
import type { ExternalSharesTableListResponse } from "../generated";
import { ObserveRestSDK } from "../client";

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
}): Promise<ExternalSharesTableListResponse> {
  const sdk = new ObserveRestSDK(config);
  return sdk.externalSharesApi.listAllTrackedTables({
    filter,
    orderBy,
    limit,
    offset,
    expand,
  });
}
