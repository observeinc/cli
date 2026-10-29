import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";

export async function deleteSourceDataset({
  config,
  id,
  force,
}: {
  config: Config;
  id: string;
  force?: boolean;
}): Promise<void> {
  const sdk = new ObserveRestSDK(config);
  await sdk.sourceDatasetApi.deleteSourceDataset({ id, force });
}
