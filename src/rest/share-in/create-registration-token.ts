import type { Config } from "../../lib/config";
import { createApiConfiguration } from "../api-config";
import { ShareInApi } from "./share-in-api";
import type { RegistrationToken } from "./types";

export async function createRegistrationToken({
  config,
  providerAccount,
}: {
  config: Config;
  providerAccount: string;
}): Promise<RegistrationToken> {
  const api = new ShareInApi(createApiConfiguration(config));
  return api.createRegistrationToken({ providerAccount });
}
