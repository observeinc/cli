import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";

export async function deleteShare({
  config,
  shareId,
  force,
}: {
  config: Config;
  shareId: string;
  force?: boolean;
}): Promise<void> {
  const sdk = new ObserveRestSDK(config);
  await sdk.externalSharesApi.deleteShare({ shareId, force });
}
