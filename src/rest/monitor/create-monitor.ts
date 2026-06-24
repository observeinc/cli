import type { Config } from "../../lib/config";
import type { MonitorApiCreateMonitorRequest, MonitorV2 } from "../generated";
import { ObserveRestSDK } from "../client";

export async function createMonitor({
  config,
  ...params
}: { config: Config } & MonitorApiCreateMonitorRequest): Promise<MonitorV2> {
  const sdk = new ObserveRestSDK(config);
  return await sdk.monitorApi.createMonitor(params);
}
