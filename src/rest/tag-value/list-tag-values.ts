import type { Config } from "../../lib/config";
import {
  KGV2DocumentType,
  KGV2SearchMode,
  type KGV2DocumentSearchRequest,
} from "../generated";
import { ObserveRestSDK } from "../client";
import { TagKind, type TagValuesResponse } from "../types/tag-values";

export async function listTagValues({
  config,
  match,
  mode = "semantic",
  limit,
}: {
  config: Config;
  match?: string;
  mode?: "semantic" | "regex";
  limit: number;
}): Promise<TagValuesResponse> {
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
      documentType: KGV2DocumentType.TagValue,
      nDocuments: limit,
      metadataPostProcessing: {
        groupByKey: "originalContent.key",
        maxGroupCount: 5,
      },
      ...searchParams,
    },
  });

  // Project KG documents into the REST TagValuesResponse envelope.
  // V1 only emits Correlation tags, so kind is hard-coded.
  const tagValuePairs = response.documents.flatMap((d) => {
    const name = d.metadata?.tagKey as string | undefined;
    const value = d.metadata?.tagValue as string | undefined;
    if (name === undefined || value === undefined) {
      return [];
    }
    return [{ name, value, kind: TagKind.Correlation }];
  });

  // KG search returns at most `limit` documents and does not surface a
  // separate population count, so totalCount mirrors the page length.
  return {
    tagValuePairs,
    meta: { totalCount: tagValuePairs.length },
  };
}
