import type { Config } from "../../lib/config";
import {
  CreateDataConnectionDocument,
  type CreateDataConnectionMutation,
  type CreateDataConnectionMutationVariables,
} from "../generated/graphql";
import { executeGraphQL } from "../gql-request";

export type GqlDataConnection =
  CreateDataConnectionMutation["createDataConnection"];

export async function createConnection(
  config: Config,
  variables: CreateDataConnectionMutationVariables,
): Promise<GqlDataConnection> {
  const response = await executeGraphQL(
    config,
    CreateDataConnectionDocument,
    variables,
  );
  return response.data.createDataConnection;
}
