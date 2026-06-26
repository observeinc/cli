import type { Config } from "../../lib/config";
import {
  DeleteDatastreamDocument,
  type DeleteDatastreamMutationVariables,
} from "../generated/graphql";
import { executeGraphQL } from "../gql-request";

export async function deleteDatastream(
  config: Config,
  variables: DeleteDatastreamMutationVariables,
): Promise<boolean> {
  const response = await executeGraphQL(
    config,
    DeleteDatastreamDocument,
    variables,
  );
  return response.data.deleteDatastream.success;
}
