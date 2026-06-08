import type { Config } from "../../lib/config";
import {
  SearchDataConnectionsDocument,
  type SearchDataConnectionsQuery,
  type SearchDataConnectionsQueryVariables,
} from "../generated/graphql";
import { executeGraphQL } from "../gql-request";

export type GqlDataConnection =
  SearchDataConnectionsQuery["searchDataConnection"]["results"][number];

export async function searchConnections(
  config: Config,
  variables?: SearchDataConnectionsQueryVariables,
): Promise<GqlDataConnection[]> {
  const response = await executeGraphQL(
    config,
    SearchDataConnectionsDocument,
    variables,
  );
  return response.data.searchDataConnection.results;
}
