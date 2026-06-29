import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";

export async function deleteMonitor({
  config,
  id,
}: {
  config: Config;
  id: number;
}): Promise<void> {
  const sdk = new ObserveRestSDK(config);
  await sdk.monitorApi.deleteMonitor({ id });
}
