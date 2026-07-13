import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { print, Kind, type DocumentNode } from "graphql";
import { getApiBaseUrl, type Config } from "../lib/config";
import { observeApiHeaders } from "../lib/user-agent";
import { tracedFetch } from "../lib/traced-fetch";

/**
 * GraphQL response wrapper
 */
interface GraphQLResponse<T> {
  data: T;
  errors?: { message: string }[];
}

/**
 * GraphQL API error
 */
export class GqlApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errors?: { message: string }[],
  ) {
    super(message);
    this.name = "GqlApiError";
  }
}

/**
 * Extract the operation name from a GraphQL document, for span naming.
 */
function operationName(document: DocumentNode) {
  for (const def of document.definitions) {
    if (def.kind === Kind.OPERATION_DEFINITION && def.name) {
      return def.name.value;
    }
  }
  return undefined;
}

/**
 * Execute a typed GraphQL query against the Observe API
 */
export async function executeGraphQL<TResult, TVariables>(
  config: Config,
  document: TypedDocumentNode<TResult, TVariables>,
  variables?: TVariables,
): Promise<GraphQLResponse<TResult>> {
  const baseUrl = getApiBaseUrl(config);
  const url = `${baseUrl}/v1/meta`;
  const name = operationName(document);

  const response = await tracedFetch(
    url,
    {
      method: "POST",
      headers: observeApiHeaders({
        Authorization: `Bearer ${config.customerId} ${config.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      }),
      body: JSON.stringify({
        query: print(document),
        variables,
      }),
    },
    { spanName: name ? `GQL ${name}` : "GQL" },
  );

  if (!response.ok) {
    throw new GqlApiError(
      `GraphQL request failed: ${response.status} ${response.statusText}`,
      response.status,
    );
  }

  const json = (await response.json()) as GraphQLResponse<TResult>;

  if (json.errors?.length) {
    throw new GqlApiError(
      json.errors.map((e) => e.message).join(", "),
      200,
      json.errors,
    );
  }

  return json;
}
