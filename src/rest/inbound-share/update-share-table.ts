import type { Config } from "../../lib/config";
import type {
  ExternalSharesTableResource,
  ExternalSharesTableUpdateRequest,
} from "../generated";
import { ObserveRestSDK } from "../client";

export async function updateShareTable({
  config,
  shareId,
  tableId,
  body,
  expand,
}: {
  config: Config;
  shareId: string;
  tableId: string;
  body: ExternalSharesTableUpdateRequest;
  expand?: boolean;
}): Promise<ExternalSharesTableResource> {
  const sdk = new ObserveRestSDK(config);
  return sdk.externalSharesApi.updateShareTable({
    shareId,
    tableId,
    externalSharesTableUpdateRequest: body,
    expand,
  });
}
