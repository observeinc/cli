import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";

export async function listDashboards({
  config,
  filter,
  orderBy,
  limit,
  offset,
}: {
  config: Config;
  filter?: string;
  orderBy?: string;
  limit?: number;
  offset?: number;
}) {
  const sdk = new ObserveRestSDK(config);
  return sdk.dashboardsApi.listDashboards({
    filter,
    orderBy,
    limit,
    offset,
    expand: true,
  });
}
