import type { Config } from "../../lib/config";
import type { ExternalSharesRegistrationToken } from "../generated";
import { ObserveRestSDK } from "../client";

export async function createRegistrationToken({
  config,
  providerAccount,
}: {
  config: Config;
  providerAccount: string;
}): Promise<ExternalSharesRegistrationToken> {
  const sdk = new ObserveRestSDK(config);
  return sdk.externalSharesApi.createRegistrationToken({
    externalSharesCreateRegistrationTokenRequest: { providerAccount },
  });
}
