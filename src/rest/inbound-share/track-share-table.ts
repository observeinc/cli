import type { Config } from "../../lib/config";
import type {
  ExternalSharesTableResource,
  ExternalSharesTrackTableRequest,
} from "../generated";
import { ObserveRestSDK } from "../client";

/** `created` is false when the table was already tracked (200, not 201). */
export async function trackShareTable({
  config,
  shareId,
  body,
  expand,
}: {
  config: Config;
  shareId: string;
  body: ExternalSharesTrackTableRequest;
  expand?: boolean;
}): Promise<{ table: ExternalSharesTableResource; created: boolean }> {
  const sdk = new ObserveRestSDK(config);
  const response = await sdk.externalSharesApi.trackShareTableRaw({
    shareId,
    externalSharesTrackTableRequest: body,
    expand,
  });
  return {
    table: await response.value(),
    created: response.raw.status === 201,
  };
}
