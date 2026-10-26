import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";
import type { DashboardUpdateRequest } from "../generated";

export async function updateDashboard({
  config,
  id,
  patch,
}: {
  config: Config;
  id: string;
  patch: DashboardUpdateRequest;
}) {
  const sdk = new ObserveRestSDK(config);
  return sdk.dashboardsApi.updateDashboard({
    id,
    dashboardUpdateRequest: patch,
    expand: true,
  });
}
