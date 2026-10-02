import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";
import { type MonitorV2, ResponseError } from "../generated";

/** Fields GET /v1/monitors/{id} returns that a generated client may drop. */
export const MONITOR_GET_PRESERVE_KEYS = [
  "actionRules",
  "health",
  "effectiveScheduling",
] as const;

/**
 * Copy actionRules, health, and effectiveScheduling from the raw GET body
 * onto the typed monitor when the API returned them.
 *
 * Codegen uses withoutRuntimeChecks: true (src/rest/config.yaml), so
 * getMonitorRaw's JSONApiResponse identity-transforms the body; this tree
 * has no MonitorV2FromJSON pick-list. The helper still copies the keys so
 * `observe monitor view --json` cannot drop them if a published or future
 * generated client filters the payload. Regenerating the client needs
 * $OBSERVE_OPENAPI_SPEC, which this change does not have. Remove this once
 * a regenerated client is shown to keep actionRules, health, and
 * effectiveScheduling.
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
