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
} & APMApiGetApmInvocationGraphRequest): Promise<ApmInvocationGraphResponse> {
  const sdk = new ObserveRestSDK(config);
  return sdk.apmApi.getApmInvocationGraph(params);
}
