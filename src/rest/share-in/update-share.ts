import type { Config } from "../../lib/config";
import { createApiConfiguration } from "../api-config";
import { ShareInApi } from "./share-in-api";
import type { ShareResource, UpdateShareRequest } from "./types";

export async function updateShare({
  config,
  shareId,
  body,
}: {
  config: Config;
  shareId: string;
  body: UpdateShareRequest;
}): Promise<ShareResource> {
  const api = new ShareInApi(createApiConfiguration(config));
  return api.updateShare({ shareId, body });
}
