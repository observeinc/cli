import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";

export async function deleteMonitorMute({
  config,
  id,
}: {
  config: Config;
  id: string;
}): Promise<void> {
  const sdk = new ObserveRestSDK(config);
  await sdk.monitorMuteApi.deleteMonitorMute({ id });
}
