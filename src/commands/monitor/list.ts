import { buildCommand } from "@stricli/core";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { listMonitors } from "../../rest/monitor/list-monitors";
import {
  type MonitorV2Terse,
  MonitorV2RuleKind,
} from "../../rest/generated";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import {
  formatTable,
  createColumnHelper,
  type ColumnDef,
} from "../../lib/formatters/table";
import { renderAsCSV } from "../../lib/formatters/csv";

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

function ruleKindColor(kind: MonitorV2RuleKind | undefined): string {
  if (!kind) return chalk.dim("-");
  switch (kind) {
    case MonitorV2RuleKind.Threshold:
      return chalk.cyan(kind);
    case MonitorV2RuleKind.Count:
      return chalk.blue(kind);
    case MonitorV2RuleKind.Promote:
      return chalk.magenta(kind);
    default:
      return chalk.dim(kind);
  }
}

const RULE_KIND_ORDER: Record<string, number> = {
  [MonitorV2RuleKind.Count]: 0,
  [MonitorV2RuleKind.Promote]: 1,
  [MonitorV2RuleKind.Threshold]: 2,
};

function sortMonitors(monitors: MonitorV2Terse[], sort: SortField): MonitorV2Terse[] {
  return [...monitors].sort((a, b) => {
    switch (sort) {
      case "id":
        return Number(a.id ?? 0) - Number(b.id ?? 0);
      case "name":
        return (a.name ?? "").localeCompare(b.name ?? "");
      case "kind":
        return (RULE_KIND_ORDER[a.ruleKind ?? ""] ?? 99) - (RULE_KIND_ORDER[b.ruleKind ?? ""] ?? 99);
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
    format: (value) => ruleKindColor(value as MonitorV2RuleKind | undefined),
  }),
  disabled: col.accessor((row) => row.disabled ?? false, {
    header: "DISABLED",
    format: (value) =>
      value ? chalk.yellow("Yes") : chalk.dim("No"),
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
      monitors = monitors.filter((m) => flags.kind!.includes(m.ruleKind as MonitorV2RuleKind));
    }

    if (flags.disabled != null) {
      monitors = monitors.filter((m) => (m.disabled ?? false) === flags.disabled);
    }

    if (flags.sort) {
      monitors = sortMonitors(monitors, flags.sort);
    }

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

    writer.write(chalk.green(`Found ${monitors.length} monitor(s):\n`));

    const columns = fieldNames.map((field) => FIELD_COLUMNS[field]);
    writer.write(formatTable(monitors, columns));
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exit(1);
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

export const listCommand = buildCommand({
  loader: async () => list as (this: LocalContext, flags: ListMonitorsFlags) => Promise<void>,
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
        brief: "Filter by disabled status (--disabled shows only disabled, --no-disabled shows only enabled)",
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
