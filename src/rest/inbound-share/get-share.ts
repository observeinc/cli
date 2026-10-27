import type { Config } from "../../lib/config";
import type { ExternalSharesShareResource } from "../generated";
import { ObserveRestSDK } from "../client";

export async function getShare({
  config,
  shareId,
}: {
  config: Config;
  shareId: string;
}): Promise<ExternalSharesShareResource> {
  const sdk = new ObserveRestSDK(config);
  return sdk.externalSharesApi.getShare({ shareId });
}
