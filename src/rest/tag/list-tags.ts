import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";
import type { TagsResponse } from "../types/tags";

/**
 * Thin wrapper over the REST `GET /v1/tags` endpoint. Passes the caller-built
 * CEL `filter`, `limit`, and `offset` through and always requests sample
 * values (this helper's contract is "tags with their values"). Results are
 * projected into the same `TagsResponse` envelope the deprecated KG helper
 * returns; `valueLimit` caps how many sample values each tag keeps.
 */
export async function listTags({
  config,
  filter,
  limit,
  offset,
  valueLimit,
}: {
  config: Config;
  filter?: string;
  limit: number;
  offset?: number;
  valueLimit?: number;
}): Promise<TagsResponse> {
  const sdk = new ObserveRestSDK(config);

  const response = await sdk.tagsApi.listDatasetTags({
    filter,
    sampleValues: true,
    limit,
    offset,
  });

  const tags = response.tags.map((tag) => {
    const allValues = tag.sampleValues ?? [];
    const values =
      typeof valueLimit === "number"
        ? allValues.slice(0, valueLimit)
        : allValues;
    return { name: tag.name, values };
  });

  return {
    tags,
    meta: { totalCount: response.meta.totalCount },
  };
}
