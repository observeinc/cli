import type {
  ApmInterval,
  ApmInvocationParticipant,
  ApmMeta,
} from "../../rest/generated";

/** Output formats shared by the read-only apm commands. */
export type OutputFormat = "json" | "csv";

/**
 * Flags shared by every apm command for choosing the query window. Either the
 * relative `--lookback` (hours) OR the absolute `--start-time`/`--end-time`
 * (ISO 8601) may be given, never both. When none are given, the server applies
 * its default window (last 1h).
 */
export interface TimeWindowFlags {
  lookback?: number;
  startTime?: string;
  endTime?: string;
}

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Resolve the time-window flags into the ISO `startTime`/`endTime` strings the
 * generated APM request types expect. `--lookback <hours>` is computed relative
 * to now; `--start-time`/`--end-time` pass through (validated + normalized to
 * ISO). Throws on conflicting flags or an unparseable timestamp.
 */
export function resolveTimeWindow(flags: TimeWindowFlags): {
  startTime?: string;
  endTime?: string;
} {
  const hasAbsolute = flags.startTime != null || flags.endTime != null;
  if (flags.lookback != null && hasAbsolute) {
    throw new Error(
      "Use either --lookback or --start-time/--end-time, not both.",
    );
  }

  if (flags.lookback != null) {
    const end = new Date();
    const start = new Date(end.getTime() - flags.lookback * MS_PER_HOUR);
    return { startTime: start.toISOString(), endTime: end.toISOString() };
  }

  return {
    startTime: flags.startTime
      ? toIso(flags.startTime, "--start-time")
      : undefined,
    endTime: flags.endTime ? toIso(flags.endTime, "--end-time") : undefined,
  };
}

function toIso(value: string, flag: string): string {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) {
    throw new Error(`${flag} must be an ISO 8601 timestamp (got "${value}").`);
  }
  return new Date(ms).toISOString();
}

const MAX_APM_LIMIT = 100000;
const MIN_APM_LIMIT = 1;

/** Positive number of hours for `--lookback`. */
export function parseLookbackHours(value: string): number {
  const num = Number(value);
  if (Number.isNaN(num) || num <= 0) {
    throw new Error(`--lookback must be a positive number of hours.`);
  }
  return num;
}

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
}): string {
  if (flags.endpointName) return "focal-endpoint";
  if (flags.serviceName) {
    return flags.directNeighborsOnly
      ? "focal-service (1-hop)"
      : "focal-service";
  }
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

/**
 * The shared `--lookback` / `--start-time` / `--end-time` flag definitions,
 * spread into each apm command's `flags` (resolved via resolveTimeWindow).
 */
export const timeWindowFlags = {
  lookback: {
    kind: "parsed",
    parse: parseLookbackHours,
    brief:
      "Relative window in hours ending now (e.g. 4). Alt to --start-time/--end-time",
    optional: true,
  },
  startTime: {
    kind: "parsed",
    parse: String,
    brief: "Absolute window start (ISO 8601). Use with --end-time",
    optional: true,
  },
  endTime: {
    kind: "parsed",
    parse: String,
    brief: "Absolute window end (ISO 8601). Use with --start-time",
    optional: true,
  },
} as const;
