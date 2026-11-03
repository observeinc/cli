import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";
import type { StorageIntegrationResource } from "../generated";

export async function getStorageIntegration({
  config,
  id,
  expand,
}: {
  config: Config;
  id: string;
  expand?: boolean;
}): Promise<StorageIntegrationResource> {
  const sdk = new ObserveRestSDK(config);
  return sdk.storageIntegrationsApi.getStorageIntegration({ id, expand });
}
