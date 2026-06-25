/**
 * Shared helpers for routing CLI tag-based lookups through the V2 Knowledge
 * Graph. Mirrors the subset of the Observe repo at
 * `observe/code/js/webapp/src/server/ai-api/ai/tools/kg-shared.ts` used by
 * the correlation-tag path. Only the reverse-lookup + batch-fetch flow is
 * ported here; the CLI does not need the semantic/regex search wrappers.
 */

import { ObserveRestSDK } from "../rest/client";
import { KGV2DocumentType } from "../rest/generated";
import type { Config } from "./config";

/**
 * KG tag-value document ids strip surrounding quotes and replace dots with
 * underscores (e.g. `service.name` -> `service_name`). Mirrors the
 * normalization used by the KG indexer so lookups match.
 */
export function normalizeTagKey(tagKey: string): string {
  return tagKey.replace(/^['"]|['"]$/g, "").replace(/\./g, "_");
}

export interface RelatedDataset {
  id: string;
  name: string;
  description: string | null;
}

export interface RelatedMetric {
  name: string;
  datasetId: string;
}

export interface RelatedEntities {
  /** Rich dataset edges (id, name, description) from the tag-value document. */
  relatedDatasets: RelatedDataset[];
  /** Rich metric edges (name, datasetId) from the tag-value document. */
  relatedMetrics: RelatedMetric[];
  /** Numeric dataset ids, for callers that only need ids. */
  relatedDatasetIds: string[];
  /** KG metric document ids in `${name}|${datasetId}` form. */
  relatedMetricIds: string[];
}

interface TagValueOriginalContent {
  datasets?: { id: string; name?: string; description?: string | null }[];
  metrics?: { name: string; datasetId: string }[];
}

function extractRelatedEntities(originalContent: unknown): RelatedEntities {
  const empty: RelatedEntities = {
    relatedDatasets: [],
    relatedMetrics: [],
    relatedDatasetIds: [],
    relatedMetricIds: [],
  };
  if (typeof originalContent !== "object" || originalContent === null) {
    return empty;
  }
  const content = originalContent as TagValueOriginalContent;
  const relatedDatasets: RelatedDataset[] = (content.datasets ?? [])
    .filter(
      (d): d is { id: string; name?: string; description?: string | null } =>
        typeof d.id === "string" && d.id.length > 0,
    )
    .map((d) => ({
      id: d.id,
      name: typeof d.name === "string" ? d.name : "",
      description:
        typeof d.description === "string" && d.description.length > 0
          ? d.description
          : null,
    }));
  const relatedMetrics: RelatedMetric[] = (content.metrics ?? []).filter(
    (m): m is RelatedMetric =>
      typeof m.name === "string" && typeof m.datasetId === "string",
  );
  return {
    relatedDatasets,
    relatedMetrics,
    relatedDatasetIds: relatedDatasets.map((d) => d.id),
    relatedMetricIds: relatedMetrics.map((m) => `${m.name}|${m.datasetId}`),
  };
}

/**
 * Look up a tag-value document in the KG and return the ids of datasets and
 * metrics associated with it. Returns empty arrays if the document is missing
 * or if its `originalContent.datasets` / `originalContent.metrics` edges are
 * absent (both are optional per `IValueTagChunkContentValidator`).
 */
export async function lookupTagValueRelatedEntities({
  config,
  key,
  value,
}: {
  config: Config;
  key: string;
  value: string;
}): Promise<RelatedEntities> {
  const api = new ObserveRestSDK(config).knowledgeGraphApi;
  // Tag-value doc id format varies by KG indexer version. Some tenants
  // normalize dots to underscores (matches AI-SRE's kg-shared.ts), others
  // keep the dots as-is. Try the normalized form first for parity with
  // AI-SRE, then fall back to the raw key.
  const candidates: string[] = [];
  const normalized = `${normalizeTagKey(key)}:${value}`;
  candidates.push(normalized);
  const raw = `${key.replace(/^['"]|['"]$/g, "")}:${value}`;
  if (raw !== normalized) candidates.push(raw);

  for (const tagValueDocId of candidates) {
    try {
      const response = await api.getDocumentV2({ id: tagValueDocId });
      const metadata = response.document.metadata as Record<string, unknown>;
      return extractRelatedEntities(metadata.originalContent);
    } catch {
      // Try next candidate (e.g. 404 on normalized form).
    }
  }
  return {
    relatedDatasets: [],
    relatedMetrics: [],
    relatedDatasetIds: [],
    relatedMetricIds: [],
  };
}

/**
 * Batch-fetch KG documents by their natural ids. Returns raw document objects
 * (metadata + originalContent); callers are responsible for projecting them
 * into the shapes expected by their consumers. Returns `[]` on error rather
 * than throwing so the CLI can degrade gracefully.
 */
export async function fetchDocumentsByIds({
  config,
  ids,
  documentType,
}: {
  config: Config;
  ids: string[];
  documentType: KGV2DocumentType;
}): Promise<unknown[]> {
  if (ids.length === 0) return [];
  const api = new ObserveRestSDK(config).knowledgeGraphApi;
  try {
    const response = await api.listDocumentsV2({
      documentIds: ids.join(","),
      documentType,
    });
    return response.documents;
  } catch {
    return [];
  }
}
