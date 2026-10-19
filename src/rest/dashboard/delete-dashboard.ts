import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";

export async function deleteDashboard({
  config,
  id,
}: {
  config: Config;
  id: string;
}) {
  const sdk = new ObserveRestSDK(config);
  await sdk.dashboardsApi.deleteDashboard({ id });
}
