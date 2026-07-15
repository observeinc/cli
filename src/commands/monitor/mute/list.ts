import { buildCommand } from "@stricli/core";
import chalk from "chalk";
import type { LocalContext } from "../../../context";
import { listMonitorMutes } from "../../../rest/monitor-mute/list-monitor-mutes";
import {
  type MonitorMuteResource,
  MonitorMuteTargetKind,
} from "../../../rest/generated";
import { celMatchesInsensitive } from "../../../lib/cel";
import { loadConfig } from "../../../lib/config";
import { formatApiError } from "../../../lib/format-error";
import { muteStatusWriter } from "../../../lib/writer";
import { parseNonNegativeInt } from "../../../lib/parsers";
import {
  formatTable,
  createColumnHelper,
  type ColumnDef,
} from "../../../lib/formatters/table";
import { renderAsCSV } from "../../../lib/formatters/csv";

type OutputFormat = "json" | "csv";
type SortField = "id" | "label" | "createdAt" | "updatedAt";

interface ListMonitorMutesFlags {
  match?: string;
  kind?: MonitorMuteTargetKind;
  limit: number;
  offset?: number;
  sort?: SortField;
  format?: OutputFormat;
  json?: boolean;
  fields?: FieldName[];
}

const AVAILABLE_FIELDS = [
  "id",
  "label",
  "target",
  "monitors",
  "schedule",
  "start",
  "end",
] as const;

type FieldName = (typeof AVAILABLE_FIELDS)[number];

const DEFAULT_FIELDS: FieldName[] = [
  "id",
  "label",
  "target",
  "schedule",
  "end",
];

function describeTarget(mute: MonitorMuteResource): string {
  return mute.target.kind === MonitorMuteTargetKind.Monitors
    ? `Monitors (${mute.target.monitors.length})`
    : "Global";
}

const col = createColumnHelper<MonitorMuteResource>();

const FIELD_COLUMNS = {
  id: col.accessor((row) => row.id, {
    header: "ID",
  }),
  label: col.accessor((row) => row.label, {
    header: "LABEL",
  }),
  target: col.accessor(describeTarget, {
    header: "TARGET",
    format: (value) =>
      value === "Global" ? chalk.yellow(value) : chalk.cyan(value),
  }),
  monitors: col.accessor(
    (row) =>
      row.target.kind === MonitorMuteTargetKind.Monitors
        ? row.target.monitors.map((m) => m.id).join(", ") || "-"
        : "-",
    {
      header: "MONITORS",
    },
  ),
  schedule: col.accessor((row) => row.schedule.kind, {
    header: "SCHEDULE",
  }),
  start: col.accessor((row) => row.startTime ?? "-", {
    header: "START",
  }),
  end: col.accessor((row) => row.endTime ?? chalk.dim("open-ended"), {
    header: "END",
  }),
} satisfies Record<FieldName, ColumnDef<MonitorMuteResource>>;

export interface ListMonitorMutesDeps {
  loadConfig?: typeof loadConfig;
}

export async function list(
  this: LocalContext,
  flags: ListMonitorMutesFlags,
  deps: ListMonitorMutesDeps = {},
): Promise<void> {
  const { loadConfig: loadConfigImpl = loadConfig } = deps;
  const { process, writer: _writer } = this;

  const format = flags.json ? ("json" as const) : flags.format;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  try {
    const config = loadConfigImpl();

    writer.info("Searching monitor mutes...");

    const filters: string[] = [];
    if (flags.match) {
      filters.push(celMatchesInsensitive("label", flags.match));
    }
    if (flags.kind) {
      filters.push(`target.kind == "${flags.kind}"`);
    }
    const filter = filters.length > 0 ? filters.join(" && ") : undefined;

    const result = await listMonitorMutes({
      config,
      filter,
      limit: flags.limit,
      offset: flags.offset,
      orderBy: flags.sort,
    });

    const mutes = result.monitorMutes;
    const fieldNames = flags.fields ?? DEFAULT_FIELDS;

    if (format === "json") {
      writer.write(JSON.stringify(mutes, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(mutes));
      return;
    }

    if (mutes.length === 0) {
      writer.warn("No monitor mutes found.");
      return;
    }

    writer.write(chalk.green(`Found ${mutes.length} monitor mute(s):\n`));

    const columns = fieldNames.map((field) => FIELD_COLUMNS[field]);
    writer.write(formatTable(mutes, columns));

    if (mutes.length === flags.limit) {
      const nextOffset = (flags.offset ?? 0) + flags.limit;
      writer.info(
        `\nMore results may be available. Use --offset ${nextOffset} to see the next page.`,
      );
    }
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exitCode = 1;
  }
}

const MAX_LIMIT = 1000;
const MIN_LIMIT = 1;
const DEFAULT_LIMIT = 100;

function parseLimit(value: string): number {
  const num = Number(value);
  if (isNaN(num) || num < MIN_LIMIT || num > MAX_LIMIT) {
    throw new Error(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`);
  }
  return num;
}

function parseFields(value: string): FieldName[] {
  const fields = value.split(",").map((f) => f.trim()) as FieldName[];
  for (const field of fields) {
    if (!AVAILABLE_FIELDS.includes(field)) {
      throw new Error(
        `Invalid field: "${field}". Available fields: ${AVAILABLE_FIELDS.join(", ")}`,
      );
    }
  }
  return fields;
}

const VALID_KINDS = Object.values(MonitorMuteTargetKind);

function parseKind(value: string): MonitorMuteTargetKind {
  if (!VALID_KINDS.includes(value as MonitorMuteTargetKind)) {
    throw new Error(
      `Invalid kind: "${value}". Available kinds: ${VALID_KINDS.join(", ")}`,
    );
  }
  return value as MonitorMuteTargetKind;
}

export const listCommand = buildCommand({
  loader: async () => list,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
    flags: {
      match: {
        kind: "parsed",
        parse: String,
        brief: "Search mute rules by label substring",
        optional: true,
      },
      kind: {
        kind: "parsed",
        parse: parseKind,
        brief: `Filter by target kind: ${VALID_KINDS.join(", ")}`,
        optional: true,
      },
      limit: {
        kind: "parsed",
        parse: parseLimit,
        brief: `Maximum number of mute rules to return (${MIN_LIMIT}-${MAX_LIMIT})`,
        default: String(DEFAULT_LIMIT),
      },
      offset: {
        kind: "parsed",
        parse: parseNonNegativeInt,
        brief: "Offset for pagination (skip this many results)",
        optional: true,
      },
      sort: {
        kind: "enum",
        values: ["id", "label", "createdAt", "updatedAt"],
        brief:
          "Sort results by field (prefix with - for descending, e.g. -createdAt)",
        optional: true,
      },
      format: {
        kind: "enum",
        values: ["json", "csv"],
        brief: "Output format (json, csv)",
        optional: true,
      },
      json: {
        kind: "boolean",
        brief: "Output as JSON (shorthand for --format=json)",
        optional: true,
      },
      fields: {
        kind: "parsed",
        parse: parseFields,
        brief: `Comma-separated list of fields: ${AVAILABLE_FIELDS.join(", ")}`,
        optional: true,
      },
    },
    aliases: {
      m: "match",
      l: "limit",
      s: "sort",
    },
  },
  docs: {
    brief: "Search and list monitor mute rules in Observe",
  },
});
