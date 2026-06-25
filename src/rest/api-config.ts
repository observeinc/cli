import { Configuration } from "./generated";
import { getApiBaseUrl, type Config } from "../lib/config";
import { observeApiHeaders } from "../lib/user-agent";

export function createApiConfiguration(config: Config) {
  return new Configuration({
    basePath: getApiBaseUrl(config),
    accessToken: async () => `${config.customerId} ${config.token}`,
    headers: observeApiHeaders(),
  });
}
