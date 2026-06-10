import type { Config } from "../../lib/config";
import {
  GetDataConnectionDocument,
  type GetDataConnectionQuery,
  type GetDataConnectionQueryVariables,
} from "../generated/graphql";
import { executeGraphQL } from "../gql-request";

export type GqlDataConnection = GetDataConnectionQuery["dataConnection"];

export async function getConnection(
  config: Config,
  variables: GetDataConnectionQueryVariables,
): Promise<GqlDataConnection> {
  const response = await executeGraphQL(
    config,
    GetDataConnectionDocument,
    variables,
  );
  return response.data.dataConnection;
}
