import type { Config } from "../../lib/config";
import {
  SaveDatasetDocument,
  type SaveDatasetMutationVariables,
} from "../generated/graphql";
import { executeGraphQL } from "../gql-request";

export async function saveDataset(
  config: Config,
  variables: SaveDatasetMutationVariables,
) {
  const response = await executeGraphQL(config, SaveDatasetDocument, variables);
  const result = response.data.saveDataset;
  if (!result?.dataset) {
    throw new Error("saveDataset returned no dataset");
  }
  return result.dataset;
}
