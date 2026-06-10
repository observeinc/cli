import { DatasourceType } from "../../gql/generated/graphql.js";

/**
 * Coerce a CLI --type flag value into the GQL DatasourceType enum.
 * Accepts the case-insensitive shorthand the help text advertises
 * ("filedrop", "poller") and falls through any unrecognized value
 * for the GQL layer to validate.
 */
export function parseDatasourceType(
  value: string | undefined,
): DatasourceType | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  if (upper === "FILEDROP") return DatasourceType.Filedrop;
  if (upper === "POLLER") return DatasourceType.Poller;
  return value as DatasourceType;
}
