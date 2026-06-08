import type { Config } from "../../lib/config";
import {
  UpdateDatasourceDocument,
  type UpdateDatasourceMutation,
  type UpdateDatasourceMutationVariables,
} from "../generated/graphql";
import { executeGraphQL } from "../gql-request";

export type GqlDatasource = UpdateDatasourceMutation["updateDatasource"];

export async function updateDatasource(
  config: Config,
  variables: UpdateDatasourceMutationVariables,
): Promise<GqlDatasource> {
  const response = await executeGraphQL(
    config,
    UpdateDatasourceDocument,
    variables,
  );
  return response.data.updateDatasource;
}
