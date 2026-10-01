import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";
import { type MonitorV2, ResponseError } from "../generated";

/** Fields GET /v1/monitors/{id} returns that a stale generated MonitorV2 may drop. */
export const MONITOR_GET_PRESERVE_KEYS = [
  "actionRules",
  "health",
  "effectiveScheduling",
] as const;

/**
 * Copy actionRules, health, and effectiveScheduling from the raw GET body
 * onto the typed monitor. The typescript-fetch FromJSON pick-list omits
 * properties that were missing from the spec at codegen time, which is how
 * `observe monitor view --json` lost notification actions.
 */
export function preserveMonitorGetFields(
  parsed: MonitorV2,
  raw: Record<string, unknown>,
): MonitorV2 {
  const out: MonitorV2 = { ...parsed };
  for (const key of MONITOR_GET_PRESERVE_KEYS) {
    if (Object.hasOwn(raw, key) && raw[key] !== undefined) {
      (out as Record<string, unknown>)[key] = raw[key];
    }
  }
  return out;
}

export async function getMonitor({
  config,
  id,
}: {
  config: Config;
  id: number;
}): Promise<MonitorV2 | null> {
  const sdk = new ObserveRestSDK(config);
  try {
    const response = await sdk.monitorApi.getMonitorRaw({ id });
    const raw: unknown = await response.raw.clone().json();
    const parsed = await response.value();
    if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
      return preserveMonitorGetFields(parsed, raw as Record<string, unknown>);
    }
    return parsed;
  } catch (error) {
    if (error instanceof ResponseError && error.response.status === 404) {
      return null;
    }
    throw error;
  }
}
