import type { Config } from "../../lib/config";
import type {
  APMApiGetApmInvocationGraphRequest,
  ApmInvocationGraphResponse,
} from "../generated";
import { ObserveRestSDK } from "../client";

// The invocation-graph endpoint rejects `limit`/`offset` (the graph is returned
// in a single, non-paginated response), so the caller must never populate them.
export async function getApmInvocationGraph({
  config,
  ...params
}: {
  config: Config;
} & APMApiGetApmInvocationGraphRequest & {
    serviceType?: string;
  }): Promise<ApmInvocationGraphResponse> {
  const sdk = new ObserveRestSDK(config);
  // Intersection until generated OpenAPI types include serviceType; pass as a
  // variable so extra fields are excess-property-safe.
  const request: APMApiGetApmInvocationGraphRequest & { serviceType?: string } =
    params;
  return sdk.apmApi.getApmInvocationGraph(request);
}
