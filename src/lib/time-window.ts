/**
 * Shared time-window flags + resolution for the query-like commands (`query`,
 * `apm …`), so window semantics are consistent across the CLI.
 *
 * A window is either relative (`--interval`, a duration like `1h`) or absolute
 * (`--start`/`--end`, ISO 8601) — never both. `resolveWindow` returns the ISO
 * bounds it can determine; either may be omitted (APM endpoints fill an omitted
 * bound server-side). Consumers that need concrete bounds (e.g. `observe query`)
 * fill the remainder with `concretizeWindow`.
 */

export interface TimeWindowFlags {
  start?: string;
  end?: string;
  interval?: string;
}

const INTERVAL_UNIT_MS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

/** Parse a duration like `1h`, `5m`, `30s`, `7d` into milliseconds. */
export function intervalToMs(value: string): number {
  const match = /^(\d+)(ms|s|m|h|d|w)$/i.exec(value.trim());
  if (!match) {
    throw new Error(
      `Invalid interval: "${value}". Expected a duration like "1h", "5m", or "30s".`,
    );
  }
  const amount = parseInt(match[1] ?? "0", 10);
  const unit = (match[2] ?? "").toLowerCase();
  const factor = INTERVAL_UNIT_MS[unit];
  if (factor === undefined) {
    throw new Error(`Invalid interval unit: "${unit}"`);
  }
  return amount * factor;
}

function toIso(value: string, flag: string): string {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) {
    throw new Error(`${flag} must be an ISO 8601 timestamp (got "${value}").`);
  }
  return new Date(ms).toISOString();
}

/**
 * Resolve the window flags into ISO bounds. `--interval` and `--start`/`--end`
 * are mutually exclusive (throws otherwise). `--interval` anchors a concrete
 * window ending now; absolute bounds are validated + normalized to ISO and
 * passed through as given (a lone `--start` or `--end` is preserved — the caller
 * decides how to fill the other side). Neither given → `{}`.
 */
export function resolveWindow(flags: TimeWindowFlags): {
  startTime?: string;
  endTime?: string;
} {
  const hasAbsolute = flags.start != null || flags.end != null;
  if (flags.interval != null && hasAbsolute) {
    throw new Error("Use either --interval or --start/--end, not both.");
  }

  if (flags.interval != null) {
    const end = new Date();
    const start = new Date(end.getTime() - intervalToMs(flags.interval));
    return { startTime: start.toISOString(), endTime: end.toISOString() };
  }

  return {
    startTime: flags.start ? toIso(flags.start, "--start") : undefined,
    endTime: flags.end ? toIso(flags.end, "--end") : undefined,
  };
}

/**
 * Fill a resolved window to concrete start+end for consumers that require both
 * (e.g. `observe query`). A missing `endTime` defaults to now; a missing
 * `startTime` defaults to `endTime - defaultInterval`.
 */
export function concretizeWindow(
  window: { startTime?: string; endTime?: string },
  defaultInterval: string,
): { startTime: string; endTime: string } {
  const endTime = window.endTime ?? new Date().toISOString();
  const startTime =
    window.startTime ??
    new Date(Date.parse(endTime) - intervalToMs(defaultInterval)).toISOString();
  return { startTime, endTime };
}

/**
 * Shared stricli flag fragment. Spread into a command's `flags`. Each command
 * sets its own aliases (e.g. `query` uses -s/-e/-t; the apm commands reserve -s
 * for --sort).
 */
export const timeWindowFlags = {
  start: {
    kind: "parsed",
    parse: String,
    brief: "Absolute window start (ISO 8601), optionally with --end",
    optional: true,
  },
  end: {
    kind: "parsed",
    parse: String,
    brief: "Absolute window end (ISO 8601), optionally with --start",
    optional: true,
  },
  interval: {
    kind: "parsed",
    parse: String,
    brief:
      "Relative window ending now, e.g. 1h, 24h, 7d (alt to --start/--end)",
    optional: true,
  },
} as const;
