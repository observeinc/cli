import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";
import type {
  SourceDatasetApiListSourceDatasetsRequest,
  SourceDatasetListResponse,
} from "../generated";

export async function listSourceDatasets({
  config,
  ...params
}: SourceDatasetApiListSourceDatasetsRequest & {
  config: Config;
}): Promise<SourceDatasetListResponse> {
  const sdk = new ObserveRestSDK(config);
  return sdk.sourceDatasetApi.listSourceDatasets(params);
}
