import type { Config } from "../../lib/config";
import {
  ListModuleVersionsDocument,
  type ListModuleVersionsQuery,
} from "../generated/graphql";
import { executeGraphQL } from "../gql-request";

export type GqlModuleVersion =
  ListModuleVersionsQuery["moduleVersions"][number];

export async function listModuleVersions(
  config: Config,
  variables: { id: string },
): Promise<GqlModuleVersion[]> {
  const response = await executeGraphQL(
    config,
    ListModuleVersionsDocument,
    variables,
  );
  return response.data.moduleVersions;
}

/**
 * Pick the latest stable version of a module.
 *
 * The server returns the list sorted descending by semver, with prereleases
 * (e.g. "0.5.0-2.beta+g4845c02") sorted *after* their stable counterpart per
 * semver semantics. Stable versions have no `-` after the semver core. Pick
 * the first stable; fall back to the first entry overall if none exists
 * (rare for a published connection module).
 */
export function pickLatestStableVersion(
  versions: GqlModuleVersion[],
): string | undefined {
  const stable = versions.find((v) => !v.version.includes("-"));
  return (stable ?? versions[0])?.version;
}
