/**
 * KG-backed metric search used by
 * `metric list --correlation-tag-key/--correlation-tag-value`.
 *
 * GraphQL `metricSearch` has no correlation-tag argument, so we route
 * through the V2 Knowledge Graph: look up the tag-value document and
 * project its related metric edges into GQL-compatible match objects
 * wrapped in the same envelope shape that `listMetrics` returns.
 *
 *   - Input: `{ config, correlationTagKey, correlationTagValue, match?,
 *     limit?, offset? }` — the same client-facing substring + pagination
 *     knobs as the GQL helper.
 *   - Output: `{ matches, numSearched: "-1", datasets: [] }` — mirroring
 *     `response.data.metricSearch`. `numSearched: "-1"` signals "unknown /
 *     truncated" (KG truncates results, so the count cannot be a true
 *     population total).
 *
 * Filter ordering is `match` → `offset` → `limit` so `--limit N` never
 * cuts off a row that would have matched `--match` past the cut.
 */

import { fuzzyContains } from "../lib/cel";
import type { Config } from "../lib/config";
import {
  fetchDocumentsByIds,
  lookupTagValueRelatedEntities,
  type RelatedEntities,
  type RelatedMetric,
} from "../lib/kg-search";
import { KGV2DocumentType } from "../rest/generated";
import { MetricState } from "../gql/generated/graphql";
import type { GqlMetricMatch } from "../gql/metric/list-metrics";

interface MetricKGContent {
  metric?: {
    name?: string;
    datasetId?: string;
    nameWithPath?: string | null;
    description?: string | null;
    type?: string | null;
    unit?: string | null;
    aggregate?: string | null;
    rollup?: string | null;
  };
}

interface MetricKGDocument {
  id?: string;
  metadata?: {
    originalContent?: MetricKGContent;
  };
}

function projectMetricDoc(doc: MetricKGDocument): GqlMetricMatch | null {
  const m = doc.metadata?.originalContent?.metric;
  if (!m?.name || !m.datasetId) return null;
  return {
    datasetId: m.datasetId,
    metric: {
      name: m.name,
      nameWithPath: m.nameWithPath ?? "",
      description: m.description ?? "",
      type: (m.type ?? "") as GqlMetricMatch["metric"]["type"],
      unit: m.unit ?? "",
      aggregate: m.aggregate ?? "",
      rollup: m.rollup ?? "",
      state: MetricState.Active,
      interval: null,
      userDefined: false,
    },
  };
}

/**
 * Fallback projection from a tag-value edge when the metric KG document
 * is unavailable (e.g. tenant keys metric docs differently than
 * `${name}|${id}`). Keeps `--format json` shape stable with empty strings
 * for unknown leaves.
 */
function projectRelatedMetric(m: RelatedMetric): GqlMetricMatch {
  return {
    datasetId: m.datasetId,
    metric: {
      name: m.name,
      nameWithPath: "",
      description: "",
      type: "" as GqlMetricMatch["metric"]["type"],
      unit: "",
      aggregate: "",
      rollup: "",
      state: MetricState.Active,
      interval: null,
      userDefined: false,
    },
  };
}

export async function searchMetricsViaKG({
  config,
  correlationTagKey,
  correlationTagValue,
  match,
  limit,
  offset,
}: {
  config: Config;
  correlationTagKey: string;
  correlationTagValue: string;
  match?: string;
  limit?: number;
  offset?: number;
}) {
  const related: RelatedEntities = await lookupTagValueRelatedEntities({
    config,
    key: correlationTagKey,
    value: correlationTagValue,
  });

  if (related.relatedMetrics.length === 0) {
    return { matches: [], numSearched: "-1", datasets: [] };
  }

  const edgeByKey = new Map<string, RelatedMetric>();
  for (const m of related.relatedMetrics) {
    const key = `${m.name}|${m.datasetId}`;
    if (edgeByKey.has(key)) continue;
    edgeByKey.set(key, m);
  }

  const ids = Array.from(edgeByKey.keys());
  const documents = (await fetchDocumentsByIds({
    config,
    ids,
    documentType: KGV2DocumentType.Metric,
  })) as MetricKGDocument[];

  const rowsByKey = new Map<string, GqlMetricMatch>();
  for (const doc of documents) {
    const row = projectMetricDoc(doc);
    if (!row) continue;
    const key = `${row.metric.name}|${row.datasetId}`;
    if (rowsByKey.has(key)) continue;
    rowsByKey.set(key, row);
  }

  // Fall back to the tag-value edge for any ids fetchDocumentsByIds did
  // not resolve (e.g. tenant keys metric docs with a different scheme).
  for (const [key, edge] of edgeByKey) {
    if (!rowsByKey.has(key)) {
      rowsByKey.set(key, projectRelatedMetric(edge));
    }
  }

  const rows = Array.from(rowsByKey.values());
  const filtered =
    match != null && match !== ""
      ? rows.filter((r) => fuzzyContains(r.metric.name, match))
      : rows;
  const start = offset ?? 0;
  const sliced =
    limit != null
      ? filtered.slice(start, start + limit)
      : filtered.slice(start);

  return { matches: sliced, numSearched: "-1", datasets: [] };
}
