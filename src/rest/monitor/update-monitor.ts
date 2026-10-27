import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";
import type { MonitorApi } from "../generated";
import type { MonitorV2PatchRequest } from "./types";

export interface UpdateMonitorSdk {
  monitorApi: Pick<MonitorApi, "updateMonitor">;
}

export async function updateMonitor({
  config,
  id,
  sdk,
  ...patch
}: {
  config: Config;
  id: number;
  sdk?: UpdateMonitorSdk;
} & MonitorV2PatchRequest): Promise<void> {
  const client = sdk ?? new ObserveRestSDK(config);
  // No Observe-Api-Version header, so the server takes the legacy body. The
  // generated body key is `monitorV2PatchRequest` or `monitorUpdateRequest`
  // depending on the spec; send both so either client forwards it untouched.
  const request = {
    id: String(id),
    monitorV2PatchRequest: patch,
    monitorUpdateRequest: patch,
  };
  await client.monitorApi.updateMonitor(
    request as unknown as Parameters<MonitorApi["updateMonitor"]>[0],
  );
}
