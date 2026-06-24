import type { Config } from "../../lib/config";
import type { MonitorV2 } from "../generated";
import { ResponseError } from "../generated/runtime";
import { ObserveRestSDK } from "../client";

export async function getMonitor({
  config,
  id,
}: {
  config: Config;
  id: number;
}): Promise<MonitorV2 | null> {
  const sdk = new ObserveRestSDK(config);
  try {
    return await sdk.monitorApi.getMonitor({ id });
  } catch (error) {
    if (error instanceof ResponseError && error.response.status === 404) {
      return null;
    }
    throw error;
  }
}
