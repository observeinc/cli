import type { Config } from "../../lib/config";
import type { MonitorApiListMonitorsRequest } from "../generated";
import { ObserveRestSDK } from "../client";

export async function listMonitors({
  config,
  ...params
}: { config: Config } & MonitorApiListMonitorsRequest) {
  const sdk = new ObserveRestSDK(config);
  return await sdk.monitorApi.listMonitors(params);
}
