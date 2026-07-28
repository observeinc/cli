import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";
import type { TagKeysResponse } from "../types/tag-keys";

/**
 * Thin wrapper over the REST `GET /v1/tags` endpoint. Passes the caller-built
 * CEL `filter`, `limit`, and `offset` through and always requests sample
 * values (this helper's contract is "tag keys with their values"). Results are
 * projected into the same `TagKeysResponse` envelope the deprecated KG helper
 * returns; `valueLimit` caps how many sample values each key keeps.
 */
export async function listTagKeys({
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
}): Promise<TagKeysResponse> {
  const sdk = new ObserveRestSDK(config);

  const response = await sdk.tagsApi.listDatasetTags({
    filter,
    sampleValues: true,
    limit,
    offset,
  });

  const tagKeys = response.tags.map((tag) => {
    const allValues = tag.sampleValues ?? [];
    const values =
      typeof valueLimit === "number"
        ? allValues.slice(0, valueLimit)
        : allValues;
    return { name: tag.name, values };
  });

  return {
    tagKeys,
    meta: { totalCount: response.meta.totalCount },
  };
}
