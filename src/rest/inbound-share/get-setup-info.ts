import type { Config } from "../../lib/config";
import { createApiConfiguration } from "../api-config";
import { InboundShareApi } from "./inbound-share-api";
import type { SetupInfo } from "./types";

export async function getSetupInfo({
  config,
}: {
  config: Config;
}): Promise<SetupInfo> {
  const api = new InboundShareApi(createApiConfiguration(config));
  return api.getSetupInfo();
}
