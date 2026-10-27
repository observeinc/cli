import type { Config } from "../../lib/config";
import type {
  ExternalSharesAttachDatasetRequest,
  ExternalSharesTableResource,
} from "../generated";
import { ObserveRestSDK } from "../client";

export async function attachTableDataset({
  config,
  shareId,
  tableId,
  body,
}: {
  config: Config;
  shareId: string;
  tableId: string;
  body: ExternalSharesAttachDatasetRequest;
}): Promise<ExternalSharesTableResource> {
  const sdk = new ObserveRestSDK(config);
  return sdk.externalSharesApi.attachTableDataset({
    shareId,
    tableId,
    externalSharesAttachDatasetRequest: body,
  });
}
