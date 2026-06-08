import type { Config } from "../../lib/config";
import {
  GetDatasourceDocument,
  type GetDatasourceQuery,
  type GetDatasourceQueryVariables,
} from "../generated/graphql";
import { executeGraphQL } from "../gql-request";

export type GqlDatasource = GetDatasourceQuery["datasource"];

export async function getDatasource(
  config: Config,
  variables: GetDatasourceQueryVariables,
): Promise<GqlDatasource> {
  const response = await executeGraphQL(
    config,
    GetDatasourceDocument,
    variables,
  );
  return response.data.datasource;
}
