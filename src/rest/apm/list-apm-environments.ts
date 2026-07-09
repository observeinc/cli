import type { Config } from "../../lib/config";
import type {
  APMApiListApmEnvironmentsRequest,
  ApmEnvironmentsListResponse,
} from "../generated";
import { ObserveRestSDK } from "../client";

export async function listApmEnvironments({
  config,
  ...params
}: {
  config: Config;
} & APMApiListApmEnvironmentsRequest): Promise<ApmEnvironmentsListResponse> {
  const sdk = new ObserveRestSDK(config);
  return sdk.apmApi.listApmEnvironments(params);
}
