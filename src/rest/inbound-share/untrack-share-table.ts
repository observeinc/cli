import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";

export async function untrackShareTable({
  config,
  shareId,
  tableId,
}: {
  config: Config;
  shareId: string;
  tableId: string;
}): Promise<void> {
  const sdk = new ObserveRestSDK(config);
  await sdk.externalSharesApi.untrackShareTable({ shareId, tableId });
}
