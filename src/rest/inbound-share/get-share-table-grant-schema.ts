import type { Config } from "../../lib/config";
import type { ExternalSharesTableSchema } from "../generated";
import { ObserveRestSDK } from "../client";

export async function getShareTableGrantSchema({
  config,
  shareId,
  schemaName,
  tableName,
}: {
  config: Config;
  shareId: string;
  schemaName: string;
  tableName: string;
}): Promise<ExternalSharesTableSchema> {
  const sdk = new ObserveRestSDK(config);
  return sdk.externalSharesApi.getShareTableGrantSchema({
    shareId,
    schemaName,
    tableName,
  });
}
