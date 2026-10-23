import type { Config } from "../../lib/config";
import { createApiConfiguration } from "../api-config";
import { SourceDatasetApi } from "./source-dataset-api";
import type {
  SourceDatasetCreateRequest,
  SourceDatasetResource,
} from "./types";

export async function createSourceDataset({
  config,
  body,
}: {
  config: Config;
  body: SourceDatasetCreateRequest;
}): Promise<SourceDatasetResource> {
  const api = new SourceDatasetApi(createApiConfiguration(config));
  return api.createSourceDataset(body);
}
