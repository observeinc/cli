import {
  MonitorMuteScheduleKind,
  type MonitorMuteScheduleInput,
  MonitorMuteTargetKind,
  type MonitorMuteTargetInput,
} from "../../../rest/generated";

/**
 * Flags shared by `create` and `update` that map onto a mute rule's `target`
 * and `schedule`. Both commands build these the same way; only their
 * required/optional handling differs (create requires them, update is partial).
 */
export interface MonitorMuteFieldFlags {
  monitors?: string[];
  global?: boolean;
  start?: string;
  end?: string;
  cron?: string;
  timezone?: string;
  duration?: number;
}

/** `--global` → Global; `--monitors a,b` → Monitors; neither → undefined. */
export function buildTarget(
  flags: MonitorMuteFieldFlags,
): MonitorMuteTargetInput | undefined {
  if (flags.global && flags.monitors && flags.monitors.length > 0) {
    throw new Error("Pass either --global or --monitors, not both.");
  }
  if (flags.global) {
    return { kind: MonitorMuteTargetKind.Global };
  }
  if (flags.monitors && flags.monitors.length > 0) {
    return {
      kind: MonitorMuteTargetKind.Monitors,
      monitors: flags.monitors.map((id) => ({ id })),
    };
  }
  return undefined;
}

/**
 * `--start [--end]` → OneTime; `--cron --timezone --duration` → Recurring;
 * neither → undefined. The two schedule shapes are mutually exclusive.
 */
export function buildSchedule(
  flags: MonitorMuteFieldFlags,
): MonitorMuteScheduleInput | undefined {
  const hasRecurring =
    flags.cron !== undefined ||
    flags.timezone !== undefined ||
    flags.duration !== undefined;
  const hasOneTime = flags.start !== undefined || flags.end !== undefined;

  if (hasRecurring && hasOneTime) {
    throw new Error(
      "Pass either a one-time window (--start/--end) or a recurring schedule " +
        "(--cron/--timezone/--duration), not both.",
    );
  }

  if (hasRecurring) {
    if (!flags.cron || !flags.timezone || flags.duration === undefined) {
      throw new Error(
        "A recurring schedule requires --cron, --timezone, and --duration together.",
      );
    }
    return {
      kind: MonitorMuteScheduleKind.Recurring,
      recurring: {
        cronSchedule: { rawCron: flags.cron, timezone: flags.timezone },
        durationSeconds: flags.duration,
      },
    };
  }

  if (hasOneTime) {
    if (!flags.start) {
      throw new Error(
        "A one-time window requires --start (and optionally --end).",
      );
    }
    return {
      kind: MonitorMuteScheduleKind.OneTime,
      oneTime: { startTime: flags.start, endTime: flags.end ?? null },
    };
  }

  return undefined;
}

/** Parse a comma-separated `--monitors` value into a list of ids. */
export function parseMonitorIds(value: string): string[] {
  return value
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}
