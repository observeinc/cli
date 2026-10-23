import type { Config } from "../../lib/config";
import { createApiConfiguration } from "../api-config";
import { InboundShareApi } from "./inbound-share-api";
import type { RegistrationToken } from "./types";

export async function createRegistrationToken({
  config,
  providerAccount,
}: {
  config: Config;
  providerAccount: string;
}): Promise<RegistrationToken> {
  const api = new InboundShareApi(createApiConfiguration(config));
  return api.createRegistrationToken({ providerAccount });
}
