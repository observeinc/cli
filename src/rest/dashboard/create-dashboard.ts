import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";
import type { DashboardCreateRequest } from "../generated";

export async function createDashboard({
  config,
  dashboard,
}: {
  config: Config;
  dashboard: DashboardCreateRequest;
}) {
  const sdk = new ObserveRestSDK(config);
  return sdk.dashboardsApi.createDashboard({
    dashboardCreateRequest: dashboard,
    expand: true,
  });
}
