import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";
import type { MonitorCreateRequest } from "../generated";
import type { Monitor } from "./types";

/**
 * Create a monitor through the unversioned request: `observeApiVersion` is
 * left unset, so the body and the 201 response are both `Monitor` rather than
 * the generated `MonitorCreateRequest`/`MonitorResource` pair the client is
 * typed for. The generated method passes the body through untouched, so the
 * casts only restate which of the two documented shapes is on the wire.
 */
export async function createMonitor({
  config,
  monitor,
}: {
  config: Config;
  monitor: Omit<Monitor, "id">;
}): Promise<Monitor> {
  const sdk = new ObserveRestSDK(config);
  const created = await sdk.monitorApi.createMonitor({
    monitorCreateRequest: monitor as unknown as MonitorCreateRequest,
  });
  return created as unknown as Monitor;
}
