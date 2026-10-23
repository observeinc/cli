import type { Config } from "../../lib/config";
import { createApiConfiguration } from "../api-config";
import { SourceDatasetApi } from "./source-dataset-api";
import type { SourceDatasetResource } from "./types";

export async function getSourceDataset({
  config,
  id,
  expand,
}: {
  config: Config;
  id: string;
  expand?: boolean;
}): Promise<SourceDatasetResource> {
  const api = new SourceDatasetApi(createApiConfiguration(config));
  return api.getSourceDataset({ id, expand });
}
