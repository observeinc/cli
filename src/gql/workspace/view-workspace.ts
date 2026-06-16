import type { Config } from "../../lib/config";
import {
  ViewWorkspaceDocument,
  type ViewWorkspaceQuery,
} from "../generated/graphql";
import { executeGraphQL } from "../gql-request";

export type GqlWorkspaceDetail = NonNullable<
  ViewWorkspaceQuery["currentUser"]
>["workspaces"][number];

export async function viewWorkspace(
  config: Config,
): Promise<GqlWorkspaceDetail | null> {
  const response = await executeGraphQL(config, ViewWorkspaceDocument, {});
  return response.data.currentUser?.workspaces[0] ?? null;
}
