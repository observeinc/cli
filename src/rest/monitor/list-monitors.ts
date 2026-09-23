import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";
import { ResponseError } from "../generated/runtime";
import type {
  MonitorApiListMonitorsRequest,
  MonitorResource,
} from "../generated";

export async function listMonitors({
  config,
  ...params
}: {
  config: Config;
} & Omit<MonitorApiListMonitorsRequest, "observeApiVersion">): Promise<
  MonitorResource[]
> {
  const sdk = new ObserveRestSDK(config);

  try {
    // Use the versioned envelope when the feature is enabled for this account.
    const response = await sdk.monitorApi.listMonitors({
      ...params,
      observeApiVersion: "2026-08-04",
    });
    return response.monitors;
  } catch (err) {
    if (!(err instanceof ResponseError && err.response.status === 403)) {
      throw err;
    }
    // Feature not yet enabled for this account or cluster. Fall back to the
    // legacy bare-array response (no Observe-Api-Version header). The legacy
    // shape uses `name` instead of `label`; map it so the rest of the command
    // works uniformly regardless of which path was taken.
    const legacy = (await sdk.monitorApi.listMonitors(
      params,
    )) as unknown as Array<{
      id?: string;
      name?: string;
      description?: string | null;
      disabled?: boolean;
      ruleKind?: string;
      [key: string]: unknown;
    }>;
    return legacy.map(
      (m) =>
        ({
          ...m,
          label: m.name ?? "",
        }) as unknown as MonitorResource,
    );
  }
}
