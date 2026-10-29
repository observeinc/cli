import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";
import type {
  StorageIntegrationListResponse,
  StorageIntegrationsApiListStorageIntegrationsRequest,
} from "../generated";

export async function listStorageIntegrations({
  config,
  ...params
}: StorageIntegrationsApiListStorageIntegrationsRequest & {
  config: Config;
}): Promise<StorageIntegrationListResponse> {
  const sdk = new ObserveRestSDK(config);
  return sdk.storageIntegrationsApi.listStorageIntegrations(params);
}
