import type { Config } from "../../lib/config";
import { createApiConfiguration } from "../api-config";
import { ShareInApi } from "./share-in-api";
import type { SetupInfo } from "./types";

export async function getSetupInfo({
  config,
}: {
  config: Config;
}): Promise<SetupInfo> {
  const api = new ShareInApi(createApiConfiguration(config));
  return api.getSetupInfo();
}
