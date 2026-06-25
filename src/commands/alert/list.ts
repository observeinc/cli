import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { listAlerts } from "../../rest/alert/list-alerts";
import {
  type AlertResource,
  type AlertLevel,
  AlertLevel as AlertLevelEnum,
  AlertStatus,
} from "../../rest/generated";
import { celMatchesInsensitive } from "../../lib/cel";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import { parseNonNegativeInt } from "../../lib/parsers";
import {
  formatTable,
  createColumnHelper,
  type ColumnDef,
} from "../../lib/formatters/table";
import { renderAsCSV } from "../../lib/formatters/csv";

type OutputFormat = "json" | "csv";
type SortField =
  | "id"
  | "level"
  | "status"
  | "start"
  | "monitor.id"
  | "monitor.label";

interface ListAlertsFlags {
  match?: string;
  level?: AlertLevel[];
  active?: boolean;
  limit: number;
  offset?: number;
  sort?: SortField;
  format?: OutputFormat;
  json?: boolean;
  fields?: FieldName[];
}

const AVAILABLE_FIELDS = [
  "id",
  "level",
  "status",
  "monitorName",
  "start",
  "end",
  "muted",
] as const;

type FieldName = (typeof AVAILABLE_FIELDS)[number];

const DEFAULT_FIELDS: FieldName[] = [
  "id",
  "level",
  "status",
  "monitorName",
  "start",
];

function levelColor(level: AlertLevel): string {
  switch (level) {
    case AlertLevelEnum.Critical:
      return chalk.red(level);
    case AlertLevelEnum.Error:
      return chalk.redBright(level);
    case AlertLevelEnum.Warning:
      return chalk.yellow(level);
    case AlertLevelEnum.Informational:
      return chalk.blue(level);
    default:
      return chalk.dim(level);
  }
}

const col = createColumnHelper<AlertResource>();

const FIELD_COLUMNS = {
  id: col.accessor((row) => row.id, {
    header: "ID",
  }),
  level: col.accessor((row) => row.level, {
    header: "LEVEL",
    format: levelColor,
  }),
  status: col.accessor((row) => row.status, {
    header: "STATUS",
    format: (value) =>
      value === AlertStatus.Active ? chalk.green(value) : chalk.dim(value),
  }),
  monitorName: col.accessor(
    (row) => row.monitor.record?.label ?? row.monitor.id,
    {
      header: "MONITOR",
    },
  ),
  start: col.accessor((row) => row.start, {
    header: "START",
  }),
  end: col.accessor((row) => row.end ?? "-", {
    header: "END",
  }),
  muted: col.accessor((row) => row.muted, {
    header: "MUTED",
    format: (value) => (value ? chalk.yellow("Yes") : chalk.dim("No")),
  }),
} satisfies Record<FieldName, ColumnDef<AlertResource>>;

async function list(this: LocalContext, flags: ListAlertsFlags): Promise<void> {
  const { process, writer: _writer } = this;

  const format = flags.json ? ("json" as const) : flags.format;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  try {
    const config = loadConfig();

    writer.info("Searching alerts...");

    const filters: string[] = [];
    if (flags.match) {
      filters.push(celMatchesInsensitive("monitor.label", flags.match));
    }
    if (flags.level) {
      const levelExprs = flags.level.map((l) => `level == "${l}"`);
      filters.push(`(${levelExprs.join(" || ")})`);
    }
    if (flags.active != null) {
      filters.push(`status == "${flags.active ? "Active" : "Ended"}"`);
    }
    const filter = filters.length > 0 ? filters.join(" && ") : undefined;

    const result = await listAlerts({
      config,
      filter,
      limit: flags.limit,
      offset: flags.offset,
      orderBy: flags.sort,
    });

    const alerts = result.alerts;
    const fieldNames = flags.fields ?? DEFAULT_FIELDS;

    if (format === "json") {
      writer.write(JSON.stringify(alerts, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(alerts));
      return;
    }

    if (alerts.length === 0) {
      writer.warn("No alerts found.");
      return;
    }

    writer.write(chalk.green(`Found ${alerts.length} alert(s):\n`));

    const columns = fieldNames.map((field) => FIELD_COLUMNS[field]);
    writer.write(formatTable(alerts, columns));

    if (alerts.length === flags.limit) {
      const nextOffset = (flags.offset ?? 0) + flags.limit;
      writer.info(
        `\nMore results may be available. Use --offset ${nextOffset} to see the next page.`,
      );
    }
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exit(1);
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

const VALID_LEVELS = Object.values(AlertLevelEnum);

function parseLevels(value: string): AlertLevel[] {
  const levels = value.split(",").map((l) => l.trim()) as AlertLevel[];
  for (const level of levels) {
    if (!VALID_LEVELS.includes(level)) {
      throw new Error(
        `Invalid level: "${level}". Available levels: ${VALID_LEVELS.join(", ")}`,
      );
    }
  }
  return levels;
}

export const listCommand = defineCommand({
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
        brief: "Search alerts by monitor name substring",
        optional: true,
      },
      level: {
        kind: "parsed",
        parse: parseLevels,
        brief: `Filter by level(s): ${VALID_LEVELS.join(", ")}`,
        optional: true,
      },
      active: {
        kind: "boolean",
        brief: "Filter by active status (true/false)",
        optional: true,
      },
      limit: {
        kind: "parsed",
        parse: parseLimit,
        brief: `Maximum number of alerts to return (${MIN_LIMIT}-${MAX_LIMIT})`,
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
        values: [
          "id",
          "level",
          "status",
          "start",
          "monitor.id",
          "monitor.label",
        ],
        brief:
          "Sort results by field (prefix with - for descending, e.g. -start)",
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
    brief: "Search and list alerts in Observe",
  },
});
