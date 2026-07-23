import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";
import type { MetricResource } from "../generated";
import type { GqlMetricMatch } from "../../gql/metric/list-metrics";

/**
 * Project a REST `/v1/metrics` `MetricResource` into the GraphQL
 * `metricSearch` match shape so the command layer can dispatch uniformly
 * across the GraphQL, KG, and REST backends. Mirrors
 * `search-metrics-kg.ts`'s projection: unknown/enum leaves are widened with
 * casts and null leaves fall back to empty strings to keep `--format json`
 * output stable.
 *
 * `nameWithPath` is reconstructed as `"<name> (<dataset label>)"`, which
 * requires the request to set `expand=true` so `dataset.record.label` is
 * populated.
 */
function projectMetricResource(m: MetricResource): GqlMetricMatch {
  return {
    datasetId: m.dataset.id,
    metric: {
      name: m.name,
      nameWithPath: m.dataset.record?.label
        ? `${m.name} (${m.dataset.record.label})`
        : m.name,
      description: m.description ?? "",
      // The REST `type` enum carries the same string values as the GraphQL
      // one but is a distinct nominal type, so bridge it through `unknown`.
      type: m.type as unknown as GqlMetricMatch["metric"]["type"],
      unit: m.unit ?? "",
      aggregate: m.aggregate,
      rollup: m.rollup,
      state: m.status,
      interval: m.intervalMillis != null ? String(m.intervalMillis) : null,
      userDefined: m.userDefined,
    },
  };
}

/**
 * Thin wrapper over the REST `GET /v1/metrics` endpoint. Passes `filter`,
 * `limit`, and `offset` straight through (the caller assembles the CEL
 * `filter`) and forces `expand=true` so the projection can reconstruct
 * `nameWithPath`. Results are mapped into the same
 * `{ matches, numSearched, datasets }` envelope the GraphQL/KG helpers return.
 * `numSearched: "-1"` signals "unknown / truncated" since the REST endpoint
 * does not report a searched-population count.
 */
export async function listMetrics({
  config,
  filter,
  limit,
  offset,
}: {
  config: Config;
  filter?: string;
  limit?: number;
  offset?: number;
}) {
  const sdk = new ObserveRestSDK(config);

  const response = await sdk.metricsApi.listMetrics({
    filter,
    expand: true,
    limit,
    offset,
  });

  return {
    matches: response.metrics.map(projectMetricResource),
    numSearched: "-1",
    datasets: [],
  };
}
