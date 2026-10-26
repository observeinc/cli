import type { Config } from "../../lib/config";
import type { ExternalSharesTableSchema } from "../generated";
import { ObserveRestSDK } from "../client";

export async function getUntrackedTableSchema({
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
  return sdk.externalSharesApi.getUntrackedTableSchema({
    shareId,
    schemaName,
    tableName,
  });
}
