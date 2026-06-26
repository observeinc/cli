import type { Config } from "../../lib/config";
import {
  DeleteDatasetDocument,
  type DeleteDatasetMutationVariables,
} from "../generated/graphql";
import { executeGraphQL } from "../gql-request";

export async function deleteDataset(
  config: Config,
  variables: DeleteDatasetMutationVariables,
): Promise<boolean> {
  const response = await executeGraphQL(
    config,
    DeleteDatasetDocument,
    variables,
  );
  const result = response.data.deleteDataset;
  if (!result) {
    throw new Error("deleteDataset returned no result");
  }
  return result.success;
}
