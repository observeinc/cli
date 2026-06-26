import type { Config } from "../../lib/config";
import {
  DeleteIngestTokenDocument,
  type DeleteIngestTokenMutationVariables,
} from "../generated/graphql";
import { executeGraphQL } from "../gql-request";

export async function deleteIngestToken(
  config: Config,
  variables: DeleteIngestTokenMutationVariables,
): Promise<boolean> {
  const response = await executeGraphQL(
    config,
    DeleteIngestTokenDocument,
    variables,
  );
  return response.data.deleteIngestToken.success;
}
