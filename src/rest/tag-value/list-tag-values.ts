import type { Config } from "../../lib/config";
import { TagKind as GenTagKind, TagValuesSearchMode } from "../generated";
import { ObserveRestSDK } from "../client";
import { TagKind, type TagValuesResponse } from "../types/tag-values";

/**
 * Thin wrapper over the REST `GET /v1/tags/values` endpoint. Passes the
 * caller-built `query`, `mode`, `limit`, and `offset` straight through (the
 * caller decides the match-all fallback and `--mode` mapping). The response
 * already matches the `TagValuesResponse` envelope, so it passes through after
 * a small `kind` enum bridge.
 */
export async function listTagValues({
  config,
  query,
  mode,
  limit,
  offset,
}: {
  config: Config;
  query: string;
  mode: TagValuesSearchMode;
  limit: number;
  offset?: number;
}): Promise<TagValuesResponse> {
  const sdk = new ObserveRestSDK(config);

  const response = await sdk.tagValuesApi.searchTagValues({
    query,
    mode,
    limit,
    offset,
  });

  const tagValuePairs = response.tagValuePairs.map((pair) => ({
    name: pair.name,
    value: pair.value,
    kind:
      pair.kind === GenTagKind.Metric ? TagKind.Metric : TagKind.Correlation,
  }));

  return {
    tagValuePairs,
    meta: { totalCount: response.meta.totalCount },
  };
}
