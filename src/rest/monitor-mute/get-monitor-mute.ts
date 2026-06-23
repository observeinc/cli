import type { Config } from "../../lib/config";
import type { MonitorMuteResource } from "../generated";
import { ObserveRestSDK } from "../client";

export async function getMonitorMute({
  config,
  id,
}: {
  config: Config;
  id: string;
}): Promise<MonitorMuteResource> {
  const sdk = new ObserveRestSDK(config);
  return sdk.monitorMuteApi.getMonitorMute({ id, expand: true });
}
