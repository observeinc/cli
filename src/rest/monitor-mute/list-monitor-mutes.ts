import type { Config } from "../../lib/config";
import type { MonitorMuteApiListMonitorMutesRequest } from "../generated";
import { ObserveRestSDK } from "../client";

export async function listMonitorMutes({
  config,
  ...params
}: { config: Config } & Omit<MonitorMuteApiListMonitorMutesRequest, "expand">) {
  const sdk = new ObserveRestSDK(config);
  const response = await sdk.monitorMuteApi.listMonitorMutes({
    ...params,
    expand: true,
  });
  return response;
}
