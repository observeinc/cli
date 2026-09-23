import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";
import type { MonitorApiListMonitorsRequest } from "../generated";

export async function listMonitors({
  config,
  ...params
}: { config: Config } & MonitorApiListMonitorsRequest) {
  const sdk = new ObserveRestSDK(config);
  const response = await sdk.monitorApi.listMonitors(params);
  return response.monitors;
}
