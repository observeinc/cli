import type { Config } from "../../lib/config";
import { createApiConfiguration } from "../api-config";
import { InboundShareApi } from "./inbound-share-api";
import type { TableSchema } from "./types";

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
}): Promise<TableSchema> {
  const api = new InboundShareApi(createApiConfiguration(config));
  return api.getUntrackedTableSchema({ shareId, schemaName, tableName });
}
