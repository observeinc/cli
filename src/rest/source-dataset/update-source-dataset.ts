import type { Config } from "../../lib/config";
import { createApiConfiguration } from "../api-config";
import { SourceDatasetApi } from "./source-dataset-api";
import type {
  SourceDatasetResource,
  SourceDatasetUpdateRequest,
} from "./types";

export async function updateSourceDataset({
  config,
  id,
  body,
}: {
  config: Config;
  id: string;
  body: SourceDatasetUpdateRequest;
}): Promise<SourceDatasetResource> {
  const api = new SourceDatasetApi(createApiConfiguration(config));
  return api.updateSourceDataset({ id, body });
}
