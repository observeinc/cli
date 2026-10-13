import type { Config } from "../../lib/config";
import { createApiConfiguration } from "../api-config";
import { SourceDatasetApi } from "./source-dataset-api";

export async function deleteSourceDataset({
  config,
  id,
  force,
}: {
  config: Config;
  id: string;
  force?: boolean;
}): Promise<void> {
  const api = new SourceDatasetApi(createApiConfiguration(config));
  await api.deleteSourceDataset({ id, force });
}
