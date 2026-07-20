import type { Config } from "../../lib/config";
import {
  KGV2DocumentType,
  KGV2SearchMode,
  type KGV2DocumentSearchRequest,
} from "../generated";
import { ObserveRestSDK } from "../client";
import type { TagKeysResponse } from "../types/tag-keys";

function extractTagValues(originalContent: unknown): string[] {
  if (
    typeof originalContent === "object" &&
    originalContent !== null &&
    "values" in originalContent &&
    Array.isArray(originalContent.values)
  ) {
    return originalContent.values as string[];
  }
  return [];
}

/**
 * DEPRECATED correlation tag-key search backed by the V2 Knowledge Graph.
 * Retained for the default (non-experimental) path until the REST `/v1/tags`
 * backend in `list-tag-keys.ts` is promoted to GA. Prefer `listTagKeys`.
 */
export async function listTagKeysKGDeprecated({
  config,
  match,
  mode = "semantic",
  limit,
  valueLimit,
}: {
  config: Config;
  match?: string;
  mode?: "semantic" | "regex";
  limit: number;
  valueLimit?: number;
}): Promise<TagKeysResponse> {
  const sdk = new ObserveRestSDK(config);

  const searchParams: Partial<KGV2DocumentSearchRequest> =
    match && mode === "regex"
      ? {
          regex: { pattern: match },
          searchMode: KGV2SearchMode.Regex,
        }
      : match
        ? {
            searchStr: match,
            searchMode: KGV2SearchMode.Semantic,
          }
        : {
            regex: { pattern: ".*" },
            searchMode: KGV2SearchMode.Regex,
          };

  const response = await sdk.knowledgeGraphApi.searchDocumentsV2({
    kGV2DocumentSearchRequest: {
      documentType: KGV2DocumentType.TagKey,
      nDocuments: limit,
      ...searchParams,
    },
  });

  // Project KG documents into the REST TagKeysResponse envelope.
  const tagKeys = response.documents.flatMap((d) => {
    const name = d.metadata?.tagKey as string | undefined;
    if (name === undefined) {
      return [];
    }
    const allValues = extractTagValues(d.metadata?.originalContent);
    const values =
      typeof valueLimit === "number"
        ? allValues.slice(0, valueLimit)
        : allValues;
    return [{ name, values }];
  });

  return {
    tagKeys,
    meta: { totalCount: tagKeys.length },
  };
}
