import type { Config } from "../../lib/config";
import type {
  MonitorMuteCreateRequest,
  MonitorMuteResource,
} from "../generated";
import { ObserveRestSDK } from "../client";

export async function createMonitorMute({
  config,
  body,
}: {
  config: Config;
  body: MonitorMuteCreateRequest;
}): Promise<MonitorMuteResource> {
  const sdk = new ObserveRestSDK(config);
  return sdk.monitorMuteApi.createMonitorMute({
    monitorMuteCreateRequest: body,
  });
}
