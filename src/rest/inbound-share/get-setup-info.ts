import type { Config } from "../../lib/config";
import type { ExternalSharesSetupInfo } from "../generated";
import { ObserveRestSDK } from "../client";

export async function getSetupInfo({
  config,
}: {
  config: Config;
}): Promise<ExternalSharesSetupInfo> {
  const sdk = new ObserveRestSDK(config);
  return sdk.externalSharesApi.getSetupInfo();
}
