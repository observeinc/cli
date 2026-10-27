import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";
import type { MonitorUpdateRequest } from "../generated";
import type { MonitorV2PatchRequest } from "./types";

/**
 * Patch a monitor through the unversioned request (no `observeApiVersion`),
 * which takes `MonitorV2PatchRequest`; see `createMonitor` for the cast.
 */
export async function updateMonitor({
  config,
  id,
  ...patch
}: { config: Config; id: number } & MonitorV2PatchRequest): Promise<void> {
  const sdk = new ObserveRestSDK(config);
  await sdk.monitorApi.updateMonitor({
    id: String(id),
    monitorUpdateRequest: patch as unknown as MonitorUpdateRequest,
  });
}
