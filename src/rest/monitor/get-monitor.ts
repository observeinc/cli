import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";
import { type MonitorApi, type MonitorV2, ResponseError } from "../generated";

/** Fields GET /v1/monitors/{id} returns that a generated client may drop. */
const MONITOR_GET_PRESERVE_KEYS = [
  "actionRules",
  "health",
  "effectiveScheduling",
] as const;

/**
 * Copy actionRules, health, and effectiveScheduling from the raw GET body
 * onto the typed monitor when the API returned them.
 *
 * In this tree, codegen sets withoutRuntimeChecks: true, so getMonitorRaw
 * returns JSONApiResponse with the default identity transformer: value()
 * is `(json) => json` and there is no MonitorV2FromJSON. The copy then
 * writes values parsed already has, and `--json` is unchanged. The helper
 * is the guard for a generated client that drops those keys; it is a
 * no-op when the body is already complete. Remove this once a regenerated
 * client is shown to keep actionRules, health, and effectiveScheduling.
 */
export function preserveMonitorGetFields(
  parsed: MonitorV2,
  rawBody: Record<string, unknown>,
): MonitorV2 {
  const out: MonitorV2 = { ...parsed };
  for (const key of MONITOR_GET_PRESERVE_KEYS) {
    if (Object.hasOwn(rawBody, key) && rawBody[key] !== undefined) {
      (out as unknown as Record<string, unknown>)[key] = rawBody[key];
    }
  }
  return out;
}

export interface GetMonitorSdk {
  monitorApi: Pick<MonitorApi, "getMonitorRaw">;
}

export async function getMonitor({
  config,
  id,
  sdk,
}: {
  config: Config;
  id: number;
  sdk?: GetMonitorSdk;
}): Promise<MonitorV2 | null> {
  const client = sdk ?? new ObserveRestSDK(config);
  try {
    // The unversioned endpoint returns MonitorV2 even though the public
    // OpenAPI operation is typed as the newer MonitorResource shape.
    const response = await client.monitorApi.getMonitorRaw({ id: String(id) });
    // Clone first: JSONApiResponse.value() calls raw.json() and consumes the body.
    const rawBody: unknown = await response.raw.clone().json();
    const parsed = (await response.value()) as unknown as MonitorV2;
    if (
      rawBody !== null &&
      typeof rawBody === "object" &&
      !Array.isArray(rawBody)
    ) {
      return preserveMonitorGetFields(
        parsed,
        rawBody as Record<string, unknown>,
      );
    }
    return parsed;
  } catch (error) {
    if (error instanceof ResponseError && error.response.status === 404) {
      return null;
    }
    throw error;
  }
}
