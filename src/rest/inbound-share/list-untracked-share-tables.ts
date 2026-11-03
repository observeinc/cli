import type { Config } from "../../lib/config";
import type { ExternalSharesUntrackedTableListResponse } from "../generated";
import { ObserveRestSDK } from "../client";

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
}): Promise<ExternalSharesUntrackedTableListResponse> {
  const sdk = new ObserveRestSDK(config);
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- The OpenAPI spec has not exposed a replacement for this operation.
  return sdk.externalSharesApi.listUntrackedShareTables({
    shareId,
    filter,
    orderBy,
    limit,
    offset,
  });
}
