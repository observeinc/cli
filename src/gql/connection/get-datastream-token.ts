import type { Config } from "../../lib/config";
import {
  GetDatastreamTokenDocument,
  type GetDatastreamTokenQuery,
  type GetDatastreamTokenQueryVariables,
} from "../generated/graphql";
import { executeGraphQL } from "../gql-request";

export type GqlDatastreamToken = GetDatastreamTokenQuery["datastreamToken"];

export async function getDatastreamToken(
  config: Config,
  variables: GetDatastreamTokenQueryVariables,
): Promise<GqlDatastreamToken> {
  const response = await executeGraphQL(
    config,
    GetDatastreamTokenDocument,
    variables,
  );
  return response.data.datastreamToken;
}
