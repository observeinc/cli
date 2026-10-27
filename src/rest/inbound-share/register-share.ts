import type { Config } from "../../lib/config";
import type {
  ExternalSharesRegisterShareRequest,
  ExternalSharesShareResource,
} from "../generated";
import { ObserveRestSDK } from "../client";

/** `created` is false when the share was already registered (200, not 201). */
export async function registerShare({
  config,
  body,
}: {
  config: Config;
  body: ExternalSharesRegisterShareRequest;
}): Promise<{ share: ExternalSharesShareResource; created: boolean }> {
  const sdk = new ObserveRestSDK(config);
  const response = await sdk.externalSharesApi.registerShareRaw({
    externalSharesRegisterShareRequest: body,
  });
  return {
    share: await response.value(),
    created: response.raw.status === 201,
  };
}
