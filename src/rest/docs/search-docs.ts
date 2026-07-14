import type { Config } from "../../lib/config";
import type { DocumentationSearchRequest } from "../generated";
import { ObserveRestSDK } from "../client";

export async function searchDocs({
  config,
  ...params
}: { config: Config } & DocumentationSearchRequest) {
  const sdk = new ObserveRestSDK(config);
  const response = await sdk.documentationApi.searchDocumentation({
    documentationSearchRequest: params,
  });
  return response;
}
