import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";
import type { MonitorV2PatchRequest } from "../generated";

export async function updateMonitor({
  config,
  id,
  ...patch
}: { config: Config; id: number } & MonitorV2PatchRequest): Promise<void> {
  const sdk = new ObserveRestSDK(config);
  await sdk.monitorApi.updateMonitor({ id, monitorV2PatchRequest: patch });
}
