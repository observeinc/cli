import type { Config } from "../../lib/config";
import { createApiConfiguration } from "../api-config";
import { ShareInApi } from "./share-in-api";
import type { RegisterShareRequest, ShareResource } from "./types";

export async function registerShare({
  config,
  body,
}: {
  config: Config;
  body: RegisterShareRequest;
}): Promise<{ share: ShareResource; created: boolean }> {
  const api = new ShareInApi(createApiConfiguration(config));
  return api.registerShare(body);
}
