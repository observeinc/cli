import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";

export async function listDatasets({
  config,
  filter,
  query,
  limit,
  offset,
  orderBy,
}: {
  config: Config;
  filter?: string;
  query?: string;
  limit?: number;
  offset?: number;
  orderBy?: string;
}) {
  const sdk = new ObserveRestSDK(config);
  return sdk.datasetApi.listDatasets({
    filter,
    query,
    limit,
    offset,
    orderBy,
    expand: true,
  });
}
