import type { Config } from "../../lib/config";
import type {
  MonitorMuteResource,
  MonitorMuteUpdateRequest,
} from "../generated";
import { ObserveRestSDK } from "../client";

export async function updateMonitorMute({
  config,
  id,
  body,
}: {
  config: Config;
  id: string;
  body: MonitorMuteUpdateRequest;
}): Promise<MonitorMuteResource> {
  const sdk = new ObserveRestSDK(config);
  return sdk.monitorMuteApi.updateMonitorMute({
    id,
    monitorMuteUpdateRequest: body,
  });
}
