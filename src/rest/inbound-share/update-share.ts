import type { Config } from "../../lib/config";
import type {
  ExternalSharesShareResource,
  ExternalSharesUpdateShareRequest,
} from "../generated";
import { ObserveRestSDK } from "../client";

export async function updateShare({
  config,
  shareId,
  body,
}: {
  config: Config;
  shareId: string;
  body: ExternalSharesUpdateShareRequest;
}): Promise<ExternalSharesShareResource> {
  const sdk = new ObserveRestSDK(config);
  return sdk.externalSharesApi.updateShare({
    shareId,
    externalSharesUpdateShareRequest: body,
  });
}
