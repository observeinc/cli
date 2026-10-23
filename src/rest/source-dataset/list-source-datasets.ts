import type { Config } from "../../lib/config";
import { createApiConfiguration } from "../api-config";
import { SourceDatasetApi } from "./source-dataset-api";
import type { SourceDatasetListResponse } from "./types";

export async function listSourceDatasets({
  config,
  filter,
  orderBy,
  limit,
  offset,
  expand,
}: {
  config: Config;
  filter?: string;
  orderBy?: string;
  limit?: number;
  offset?: number;
  expand?: boolean;
}): Promise<SourceDatasetListResponse> {
  const api = new SourceDatasetApi(createApiConfiguration(config));
  return api.listSourceDatasets({ filter, orderBy, limit, offset, expand });
}
