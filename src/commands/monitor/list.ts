import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { listMonitors } from "../../rest/monitor/list-monitors";
import { type MonitorV2Terse, MonitorV2RuleKind } from "../../rest/generated";
import { ruleKindColor } from "./monitor-utils";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import {
  formatTable,
  createColumnHelper,
  type ColumnDef,
} from "../../lib/formatters/table";
import { renderAsCSV } from "../../lib/formatters/csv";
import { parseNonNegativeInt } from "../../lib/parsers";

type OutputFormat = "json" | "csv";
type SortField = "id" | "name" | "kind" | "disabled";

interface ListMonitorsFlags {
  match?: string;
  kind?: MonitorV2RuleKind[];
  disabled?: boolean;
  sort?: SortField;
  format?: OutputFormat;
  json?: boolean;
  fields?: FieldName[];
  limit?: number;
  offset?: number;
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

const AVAILABLE_FIELDS = [
  "id",
  "name",
  "description",
  "ruleKind",
  "disabled",
] as const;

type FieldName = (typeof AVAILABLE_FIELDS)[number];

const DEFAULT_FIELDS: FieldName[] = ["id", "name", "ruleKind", "disabled"];

const RULE_KIND_ORDER: Record<string, number> = {
  [MonitorV2RuleKind.Count]: 0,
  [MonitorV2RuleKind.Promote]: 1,
  [MonitorV2RuleKind.Threshold]: 2,
};

function sortMonitors(
  monitors: MonitorV2Terse[],
  sort: SortField,
): MonitorV2Terse[] {
  return [...monitors].sort((a, b) => {
    switch (sort) {
      case "id":
        return Number(a.id ?? 0) - Number(b.id ?? 0);
      case "name":
        return (a.name ?? "").localeCompare(b.name ?? "");
      case "kind":
        return (
          (RULE_KIND_ORDER[a.ruleKind ?? ""] ?? 99) -
          (RULE_KIND_ORDER[b.ruleKind ?? ""] ?? 99)
        );
      case "disabled":
        return Number(a.disabled ?? false) - Number(b.disabled ?? false);
    }
  });
}

const col = createColumnHelper<MonitorV2Terse>();

const FIELD_COLUMNS = {
  id: col.accessor((row) => row.id ?? "-", {
    header: "ID",
  }),
  name: col.accessor((row) => row.name ?? "-", {
    header: "NAME",
  }),
  description: col.accessor((row) => row.description ?? "-", {
    header: "DESCRIPTION",
  }),
  ruleKind: col.accessor((row) => row.ruleKind, {
    header: "KIND",
    format: (value) => ruleKindColor(value),
  }),
  disabled: col.accessor((row) => row.disabled ?? false, {
    header: "DISABLED",
    format: (value) => (value ? chalk.yellow("Yes") : chalk.dim("No")),
  }),
} satisfies Record<FieldName, ColumnDef<MonitorV2Terse>>;

export interface ListMonitorsDeps {
  loadConfig?: typeof loadConfig;
  listMonitors?: typeof listMonitors;
}

export async function list(
  this: LocalContext,
  flags: ListMonitorsFlags,
  deps: ListMonitorsDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    listMonitors: listMonitorsImpl = listMonitors,
  } = deps;
  const { process, writer: _writer } = this;

  const format = flags.json ? ("json" as const) : flags.format;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  try {
    const config = loadConfigImpl();

    writer.info("Searching monitors...");

    let monitors = await listMonitorsImpl({
      config,
      nameSubstring: flags.match,
    });

    if (flags.kind) {
      const filterKinds = flags.kind;
      monitors = monitors.filter(
        (m) => m.ruleKind != null && filterKinds.includes(m.ruleKind),
      );
    }

    if (flags.disabled != null) {
      monitors = monitors.filter(
        (m) => (m.disabled ?? false) === flags.disabled,
      );
    }

    if (flags.sort) {
      monitors = sortMonitors(monitors, flags.sort);
    }

    const limit = flags.limit ?? DEFAULT_LIMIT;
    const start = flags.offset ?? 0;
    const totalBeforePaging = monitors.length;
    monitors = monitors.slice(start, start + limit);

    const fieldNames = flags.fields ?? DEFAULT_FIELDS;

    if (format === "json") {
      writer.write(JSON.stringify(monitors, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(monitors));
      return;
    }

    if (monitors.length === 0) {
      writer.warn("No monitors found.");
      return;
    }

    writer.write(chalk.green(`Found ${totalBeforePaging} monitor(s):\n`));

    const columns = fieldNames.map((field) => FIELD_COLUMNS[field]);
    writer.write(formatTable(monitors, columns));

    if (monitors.length === limit) {
      const nextOffset = start + limit;
      writer.info(
        `\nMore results may be available. Use --offset ${nextOffset} to see the next page.`,
      );
    }
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exitCode = 1;
  }
}

const VALID_KINDS = Object.values(MonitorV2RuleKind);

function parseKind(value: string): MonitorV2RuleKind[] {
  return value.split(",").map((k) => {
    const normalized = VALID_KINDS.find(
      (v) => v.toLowerCase() === k.trim().toLowerCase(),
    );
    if (!normalized) {
      throw new Error(
        `Invalid kind: "${k.trim()}". Available kinds: ${VALID_KINDS.join(", ")}`,
      );
    }
    return normalized;
  });
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

export const listCommand = defineCommand({
  experimental: true,
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
        brief: "Search monitors by name substring",
        optional: true,
      },
      kind: {
        kind: "parsed",
        parse: parseKind,
        brief: `Filter by rule kind(s): ${VALID_KINDS.join(", ")}`,
        optional: true,
      },
      disabled: {
        kind: "boolean",
        brief:
          "Filter by disabled status (--disabled shows only disabled, --no-disabled shows only enabled)",
        optional: true,
      },
      sort: {
        kind: "enum",
        values: ["id", "name", "kind", "disabled"],
        brief: "Sort results by field",
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
      limit: {
        kind: "parsed",
        parse: parseLimit,
        brief: `Maximum monitors to return (${MIN_LIMIT}-${MAX_LIMIT}, default ${DEFAULT_LIMIT})`,
        optional: true,
      },
      offset: {
        kind: "parsed",
        parse: parseNonNegativeInt,
        brief: "Offset for pagination (skip this many results)",
        optional: true,
      },
    },
    aliases: {
      m: "match",
      s: "sort",
    },
  },
  docs: {
    brief: "Search and list monitors in Observe",
  },
});
