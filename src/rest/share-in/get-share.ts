import type { Config } from "../../lib/config";
import { createApiConfiguration } from "../api-config";
import { ShareInApi } from "./share-in-api";
import type { ShareResource } from "./types";

export async function getShare({
  config,
  shareId,
}: {
  config: Config;
  shareId: string;
}): Promise<ShareResource> {
  const api = new ShareInApi(createApiConfiguration(config));
  return api.getShare({ shareId });
}
