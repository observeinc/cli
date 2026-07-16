import { Configuration } from "./generated";
import { getApiBaseUrl, type Config } from "../lib/config";
import { observeApiHeaders } from "../lib/user-agent";
import { tracedFetch } from "../lib/traced-fetch";

export function createApiConfiguration(config: Config) {
  return new Configuration({
    basePath: getApiBaseUrl(config),
    accessToken: async () => `${config.customerId} ${config.token}`,
    headers: observeApiHeaders(),
    // Records a CLIENT span per request and injects W3C trace context so the
    // backend spans link under the CLI trace.
    fetchApi: tracedFetch,
  });
}
