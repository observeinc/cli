import type { Config } from "../../lib/config";
import { createApiConfiguration } from "../api-config";
import { ShareInApi } from "./share-in-api";

export async function untrackShareTable({
  config,
  shareId,
  tableId,
}: {
  config: Config;
  shareId: string;
  tableId: string;
}): Promise<void> {
  const api = new ShareInApi(createApiConfiguration(config));
  await api.untrackShareTable({ shareId, tableId });
}
