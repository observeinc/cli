import { buildCommand } from "@stricli/core";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { listSkills } from "../../rest/skill/list-skills";
import {
  type SkillResource,
  SkillVisibility,
  ListSkillsVisibilityParameter,
} from "../../rest/generated";
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
type VisibilityFilter = "listed" | "unlisted";

interface ListSkillsFlags {
  match?: string;
  visibility?: VisibilityFilter;
  limit: number;
  offset?: number;
  sort?: string;
  format?: OutputFormat;
  json?: boolean;
  fields?: FieldName[];
}

const AVAILABLE_FIELDS = [
  "id",
  "label",
  "description",
  "visibility",
  "createdBy",
  "createdAt",
  "updatedAt",
] as const;

type FieldName = (typeof AVAILABLE_FIELDS)[number];

const DEFAULT_FIELDS: FieldName[] = ["id", "label", "description"];

function visibilityColor(visibility: SkillVisibility): string {
  return visibility === SkillVisibility.Listed
    ? chalk.green(visibility)
    : chalk.dim(visibility);
}

const col = createColumnHelper<SkillResource>();

const FIELD_COLUMNS = {
  id: col.accessor((row) => row.id, {
    header: "ID",
  }),
  label: col.accessor((row) => row.label, {
    header: "LABEL",
    format: (value) => chalk.cyan(value),
  }),
  description: col.accessor((row) => row.description, {
    header: "DESCRIPTION",
    flex: true,
  }),
  visibility: col.accessor((row) => row.visibility, {
    header: "VISIBILITY",
    format: visibilityColor,
  }),
  createdBy: col.accessor((row) => row.createdBy.label ?? row.createdBy.id, {
    header: "CREATED BY",
  }),
  createdAt: col.accessor((row) => row.createdAt, {
    header: "CREATED",
  }),
  updatedAt: col.accessor((row) => row.updatedAt, {
    header: "UPDATED",
  }),
} satisfies Record<FieldName, ColumnDef<SkillResource>>;

async function list(this: LocalContext, flags: ListSkillsFlags): Promise<void> {
  const { process, writer: _writer } = this;

  const format = flags.json ? ("json" as const) : flags.format;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  try {
    const config = loadConfig();

    writer.info("Fetching skills...");

    const visibility =
      flags.visibility === "listed"
        ? ListSkillsVisibilityParameter.Listed
        : flags.visibility === "unlisted"
          ? ListSkillsVisibilityParameter.Unlisted
          : undefined;

    const result = await listSkills({
      config,
      limit: flags.limit,
      offset: flags.offset,
      orderBy: flags.sort,
      visibility,
    });

    let skills = result.skills;

    if (flags.match) {
      const needle = flags.match.toLowerCase();
      skills = skills.filter(
        (s) =>
          s.label.toLowerCase().includes(needle) ||
          s.description.toLowerCase().includes(needle),
      );
    }

    const fieldNames = flags.fields ?? DEFAULT_FIELDS;

    if (format === "json") {
      writer.write(JSON.stringify(skills, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(skills));
      return;
    }

    if (skills.length === 0) {
      writer.warn("No skills found.");
      return;
    }

    writer.write(chalk.green(`Found ${skills.length} skill(s):\n`));

    const columns = fieldNames.map((field) => FIELD_COLUMNS[field]);
    writer.write(formatTable(skills, columns));

    if (result.skills.length === flags.limit) {
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
        brief: "Filter skills by label or description substring",
        optional: true,
      },
      visibility: {
        kind: "enum",
        values: ["listed", "unlisted"],
        brief: "Filter by visibility (listed, unlisted)",
        optional: true,
      },
      limit: {
        kind: "parsed",
        parse: parseLimit,
        brief: `Maximum number of skills to return (${MIN_LIMIT}-${MAX_LIMIT})`,
        default: String(DEFAULT_LIMIT),
      },
      offset: {
        kind: "parsed",
        parse: parseNonNegativeInt,
        brief: "Offset for pagination (skip this many results)",
        optional: true,
      },
      sort: {
        kind: "parsed",
        parse: String,
        brief:
          "Sort results by field (e.g. label, updatedAt; prefix with - for descending)",
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
    brief: "Search and list AI agent skills in Observe",
  },
});
