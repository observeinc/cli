import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";
import { ResponseError } from "../generated/runtime";

export async function getDashboard({
  config,
  id,
}: {
  config: Config;
  id: string;
}) {
  const sdk = new ObserveRestSDK(config);
  try {
    return await sdk.dashboardsApi.getDashboard({ id, expand: true });
  } catch (error) {
    if (error instanceof ResponseError && error.response.status === 404) {
      return null;
    }
    throw error;
  }
}
