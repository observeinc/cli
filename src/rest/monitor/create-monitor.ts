import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";
import type { MonitorApiCreateMonitorRequest, MonitorV2 } from "../generated";

export async function createMonitor({
  config,
  ...params
}: { config: Config } & MonitorApiCreateMonitorRequest): Promise<MonitorV2> {
  const sdk = new ObserveRestSDK(config);
  return sdk.monitorApi.createMonitor(params);
}
