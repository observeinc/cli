import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";
import type {
  SourceDatasetCreateRequest,
  SourceDatasetResource,
} from "../generated";

export async function createSourceDataset({
  config,
  body,
}: {
  config: Config;
  body: SourceDatasetCreateRequest;
}): Promise<SourceDatasetResource> {
  const sdk = new ObserveRestSDK(config);
  return sdk.sourceDatasetApi.createSourceDataset({
    sourceDatasetCreateRequest: body,
  });
}
