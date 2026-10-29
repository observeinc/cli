import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";
import type { SourceDatasetResource } from "../generated";

export async function getSourceDataset({
  config,
  id,
  expand,
}: {
  config: Config;
  id: string;
  expand?: boolean;
}): Promise<SourceDatasetResource> {
  const sdk = new ObserveRestSDK(config);
  return sdk.sourceDatasetApi.getSourceDataset({ id, expand });
}
