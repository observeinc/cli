import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";
import type { MetricResource, MetricStatus, MetricType } from "../generated";

/** A single metric within its owning dataset, as returned by `listMetrics`. */
export interface Metric {
  name: string;
  nameWithPath: string;
  description: string;
  type: MetricType;
  unit: string;
  aggregate: string;
  rollup: string;
  state: MetricStatus;
  interval: string | null;
  userDefined: boolean;
}

export interface MetricMatch {
  datasetId: string;
  metric: Metric;
}

/**
 * Project a REST `/v1/metrics` `MetricResource` into a `MetricMatch`. Null
 * leaves fall back to empty strings to keep `--format json` output stable.
 *
 * `nameWithPath` is reconstructed as `"<name> (<dataset label>)"`, which
 * requires the request to set `expand=true` so `dataset.record.label` is
 * populated.
 */
function projectMetricResource(m: MetricResource): MetricMatch {
  return {
    datasetId: m.dataset.id,
    metric: {
      name: m.name,
      nameWithPath: m.dataset.record?.label
        ? `${m.name} (${m.dataset.record.label})`
        : m.name,
      description: m.description ?? "",
      type: m.type,
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
 * `nameWithPath`. `numSearched: "-1"` signals "unknown" since the REST
 * endpoint does not report a searched-population count.
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
  };
}
