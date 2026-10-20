import type { Config } from "../../lib/config";
import { createApiConfiguration } from "../api-config";
import { ShareInApi } from "./share-in-api";

export async function deleteShare({
  config,
  shareId,
  force,
}: {
  config: Config;
  shareId: string;
  force?: boolean;
}): Promise<void> {
  const api = new ShareInApi(createApiConfiguration(config));
  await api.deleteShare({ shareId, force });
}
