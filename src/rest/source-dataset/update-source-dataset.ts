import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";
import type {
  SourceDatasetResource,
  SourceDatasetUpdateRequest,
} from "../generated";

export async function updateSourceDataset({
  config,
  id,
  body,
}: {
  config: Config;
  id: string;
  body: SourceDatasetUpdateRequest;
}): Promise<SourceDatasetResource> {
  const sdk = new ObserveRestSDK(config);
  return sdk.sourceDatasetApi.updateSourceDataset({
    id,
    sourceDatasetUpdateRequest: body,
  });
}
