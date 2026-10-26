import type { Config } from "../../lib/config";
import type {
  ExternalSharesHealthStatusEnum,
  ExternalSharesShareListResponse,
  ExternalSharesShareStateEnum,
} from "../generated";
import { ObserveRestSDK } from "../client";

export async function listShares({
  config,
  status,
  healthStatus,
  orderBy,
  limit,
  offset,
}: {
  config: Config;
  status?: ExternalSharesShareStateEnum;
  healthStatus?: ExternalSharesHealthStatusEnum;
  orderBy?: string;
  limit?: number;
  offset?: number;
}): Promise<ExternalSharesShareListResponse> {
  const sdk = new ObserveRestSDK(config);
  return sdk.externalSharesApi.listShares({
    status,
    healthStatus,
    orderBy,
    limit,
    offset,
  });
}
