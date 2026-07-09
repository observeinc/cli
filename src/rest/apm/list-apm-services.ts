import type { Config } from "../../lib/config";
import type {
  APMApiListApmServicesRequest,
  ApmServicesListResponse,
} from "../generated";
import { ObserveRestSDK } from "../client";

export async function listApmServices({
  config,
  ...params
}: {
  config: Config;
} & APMApiListApmServicesRequest): Promise<ApmServicesListResponse> {
  const sdk = new ObserveRestSDK(config);
  return sdk.apmApi.listApmServices(params);
}
