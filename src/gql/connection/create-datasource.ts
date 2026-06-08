import type { Config } from "../../lib/config";
import {
  CreateDatasourceDocument,
  type CreateDatasourceMutation,
  type CreateDatasourceMutationVariables,
} from "../generated/graphql";
import { executeGraphQL } from "../gql-request";

export type GqlDatasource = CreateDatasourceMutation["createDatasource"];

export async function createDatasource(
  config: Config,
  variables: CreateDatasourceMutationVariables,
): Promise<GqlDatasource> {
  const response = await executeGraphQL(
    config,
    CreateDatasourceDocument,
    variables,
  );
  return response.data.createDatasource;
}
