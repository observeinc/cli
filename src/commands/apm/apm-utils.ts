import type {
  ApmInterval,
  ApmInvocationParticipant,
  ApmMeta,
} from "../../rest/generated";

/** Output formats shared by the read-only apm commands. */
export type OutputFormat = "json" | "csv";

const MAX_APM_LIMIT = 100000;
const MIN_APM_LIMIT = 1;

/**
 * `--limit` bounds. The server clamps over-large values (and further to 100
 * under --expand) rather than erroring, so this only guards obviously-invalid
 * input; the effective page size is read back from `meta.limit`.
 */
export function parseApmLimit(value: string): number {
  const num = Number(value);
  if (!Number.isInteger(num) || num < MIN_APM_LIMIT || num > MAX_APM_LIMIT) {
    throw new Error(
      `--limit must be an integer between ${MIN_APM_LIMIT} and ${MAX_APM_LIMIT}.`,
    );
  }
  return num;
}

/** Format a nullable per-second rate for table/human output. */
export function formatRate(value: number | null | undefined): string {
  return value == null ? "-" : value.toFixed(2);
}

/** Format a nullable latency (seconds) for table/human output. */
export function formatLatency(value: number | null | undefined): string {
  return value == null ? "-" : value.toFixed(3);
}

/** Render an invocation-graph participant as `ns/service@env (endpoint)`. */
export function describeNode(node: ApmInvocationParticipant): string {
  const prefix = node.serviceNamespace ? `${node.serviceNamespace}/` : "";
  const suffix = node.endpointName ? ` (${node.endpointName})` : "";
  return `${prefix}${node.serviceName}@${node.environment}${suffix}`;
}

/** Describe which invocation-graph mode a set of flags selects. */
export function describeMode(flags: {
  serviceName?: string;
  endpointName?: string;
  directNeighborsOnly?: boolean;
  environment?: string;
  crossEnvironment?: boolean;
}): string {
  if (flags.endpointName) return "focal-endpoint";
  if (flags.serviceName) {
    return flags.directNeighborsOnly
      ? "focal-service (1-hop)"
      : "focal-service";
  }
  if (flags.crossEnvironment) return "global (cross-env)";
  if (flags.environment) return `global (${flags.environment})`;
  return "global";
}

/**
 * A "more results" hint for the paginated list commands, based on the server's
 * effective page size (`meta.limit`, which reflects any server-side clamping),
 * not the requested limit. `meta.totalCount` is `-1` when unknown, in which
 * case a full page is still treated as "more may be available".
 */
export function paginationHint(meta: ApmMeta, returned: number): string | null {
  const { limit, offset, totalCount } = meta;
  if (returned === limit && (totalCount < 0 || offset + limit < totalCount)) {
    return `More results may be available. Use --offset ${offset + limit} to see the next page.`;
  }
  return null;
}

/** Render a resolved query window for human output. */
export function formatWindow(interval: ApmInterval): string {
  return `window ${interval.startTime} → ${interval.endTime}`;
}
