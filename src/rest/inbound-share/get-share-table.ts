import type { Config } from "../../lib/config";
import type { ExternalSharesTableResource } from "../generated";
import { ObserveRestSDK } from "../client";

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
}): Promise<ExternalSharesTableResource> {
  const sdk = new ObserveRestSDK(config);
  return sdk.externalSharesApi.getShareTable({ shareId, tableId, expand });
}
