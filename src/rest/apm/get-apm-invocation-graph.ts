import type { Config } from "../../lib/config";
import type {
  APMApiGetApmInvocationGraphRequest,
  ApmInvocationGraphResponse,
} from "../generated";
import { ObserveRestSDK } from "../client";
import { addQueryParamsIfMissing } from "../add-query-params-if-missing";

// The invocation-graph endpoint rejects `limit`/`offset` (the graph is returned
// in a single, non-paginated response), so the caller must never populate them.
export async function getApmInvocationGraph({
  config,
  serviceType,
  ...params
}: {
  config: Config;
} & Omit<APMApiGetApmInvocationGraphRequest, "serviceType"> & {
    serviceType?: string;
  }): Promise<ApmInvocationGraphResponse> {
  const sdk = new ObserveRestSDK(config);
  // TODO: pass serviceType through the generated request and drop the
  // middleware once the published OpenAPI spec declares it.
  return sdk.apmApi
    .withPreMiddleware(addQueryParamsIfMissing({ serviceType }))
    .getApmInvocationGraph(params);
}
