import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { listSkills } from "../../rest/skill/list-skills";
import {
  type SkillResource,
  SkillVisibility,
  ListSkillsVisibilityParameter,
} from "../../rest/generated";
import {
  getBundledRepo,
  listBundledCatalog,
} from "../../lib/skills/bundled-repo";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter, type Writer } from "../../lib/writer";
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
  userDefined?: boolean;
  match?: string;
  format?: OutputFormat;
  json?: boolean;
  // User-defined-only query flags (the platform REST path); rejected in
  // bundled mode rather than silently ignored.
  visibility?: VisibilityFilter;
  limit?: number;
  offset?: number;
  sort?: string;
}

/** Query flags that only apply to the user-defined (platform) list. */
const USER_DEFINED_ONLY_FLAGS = [
  "visibility",
  "limit",
  "offset",
  "sort",
] as const;

/** One row of the bundled catalog: a skill's frontmatter name + description. */
interface BundledSkill {
  name: string;
  description: string;
}

const bundledCol = createColumnHelper<BundledSkill>();

const BUNDLED_COLUMNS: ColumnDef<BundledSkill>[] = [
  bundledCol.accessor((row) => row.name, {
    header: "NAME",
    format: (value) => chalk.cyan(value),
  }),
  bundledCol.accessor((row) => row.description, {
    header: "DESCRIPTION",
    flex: true,
  }),
];

const userCol = createColumnHelper<SkillResource>();

const USER_DEFINED_COLUMNS: ColumnDef<SkillResource>[] = [
  userCol.accessor((row) => row.id, { header: "ID" }),
  userCol.accessor((row) => row.label, {
    header: "LABEL",
    format: (value) => chalk.cyan(value),
  }),
  userCol.accessor((row) => row.visibility, {
    header: "VISIBILITY",
    format: visibilityDisplay,
  }),
  userCol.accessor((row) => row.description, {
    header: "DESCRIPTION",
    flex: true,
  }),
];

/**
 * The user-facing visibility label. Platform skills are `Listed` (visible to
 * the whole workspace) or `Unlisted` (private to the author); we surface those
 * as `workspace` / `private`.
 */
function visibilityDisplay(visibility: SkillVisibility): string {
  return visibility === SkillVisibility.Listed
    ? chalk.green("workspace")
    : chalk.dim("private");
}

export interface ListSkillsDeps {
  loadConfig?: typeof loadConfig;
  getBundledRepo?: typeof getBundledRepo;
  listBundledCatalog?: typeof listBundledCatalog;
}

export async function list(
  this: LocalContext,
  flags: ListSkillsFlags,
  deps: ListSkillsDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    getBundledRepo: getBundledRepoImpl = getBundledRepo,
    listBundledCatalog: listBundledCatalogImpl = listBundledCatalog,
  } = deps;
  const { process, writer: _writer } = this;

  const format = flags.json ? ("json" as const) : flags.format;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  // The query flags below only shape the platform (REST) list. Reject them in
  // bundled mode rather than silently ignoring them, so `--visibility` etc.
  // never look like they filtered the bundled catalog when they did nothing.
  if (!flags.userDefined) {
    const misused = USER_DEFINED_ONLY_FLAGS.filter(
      (flag) => flags[flag] !== undefined,
    ).map((flag) => `--${flag}`);

    if (misused.length > 0) {
      writer.error(
        `${misused.join(", ")} ${misused.length === 1 ? "is" : "are"} only valid with --user-defined`,
      );
      process.exitCode = 1;
      return;
    }
  }

  try {
    // Skills are bundled (the Observe-curated catalog) by default;
    // --user-defined lists the customer's own platform skills instead.
    if (flags.userDefined) {
      await listUserDefined(writer, format, flags, loadConfigImpl);
    } else {
      await listBundled(writer, format, flags, {
        getBundledRepo: getBundledRepoImpl,
        listBundledCatalog: listBundledCatalogImpl,
      });
    }
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exitCode = 1;
  }
}

async function listBundled(
  writer: Writer,
  format: OutputFormat | undefined,
  flags: ListSkillsFlags,
  deps: {
    getBundledRepo: typeof getBundledRepo;
    listBundledCatalog: typeof listBundledCatalog;
  },
): Promise<void> {
  writer.info("Fetching skills...");

  const repo = await deps.getBundledRepo();
  const skills = filterByMatch(
    deps.listBundledCatalog(repo),
    flags.match,
    (s) => [s.name, s.description],
  );

  renderList(writer, format, skills, BUNDLED_COLUMNS);
}

async function listUserDefined(
  writer: Writer,
  format: OutputFormat | undefined,
  flags: ListSkillsFlags,
  loadConfigImpl: typeof loadConfig,
): Promise<void> {
  const config = loadConfigImpl();
  const limit = flags.limit ?? DEFAULT_LIMIT;

  writer.info("Fetching skills...");

  const visibility =
    flags.visibility === "listed"
      ? ListSkillsVisibilityParameter.Listed
      : flags.visibility === "unlisted"
        ? ListSkillsVisibilityParameter.Unlisted
        : undefined;

  const result = await listSkills({
    config,
    limit,
    offset: flags.offset,
    orderBy: flags.sort,
    visibility,
  });

  const skills = filterByMatch(result.skills, flags.match, (s) => [
    s.label,
    s.description,
  ]);

  const rendered = renderList(writer, format, skills, USER_DEFINED_COLUMNS);

  // A full page back from the API means there may be more; the hint only makes
  // sense alongside a rendered table (not under --json/--csv or an empty list).
  if (rendered && result.skills.length === limit) {
    const nextOffset = (flags.offset ?? 0) + limit;
    writer.info(
      `\nMore results may be available. Use --offset ${nextOffset} to see the next page.`,
    );
  }
}

/**
 * Case-insensitive substring filter over the fields `fields` extracts from each
 * item. Returns the list unchanged when `match` is empty.
 */
function filterByMatch<T>(
  items: T[],
  match: string | undefined,
  fields: (item: T) => string[],
): T[] {
  if (!match) return items;
  const needle = match.toLowerCase();
  return items.filter((item) =>
    fields(item).some((field) => field.toLowerCase().includes(needle)),
  );
}

/**
 * Render a list of skills in whichever output mode is active — `--json`,
 * `--csv`, or (default) a table with a count header, warning instead when the
 * list is empty. Returns true only when it drew the table, so the caller can
 * append trailing output (e.g. a pagination hint) that belongs with it.
 */
function renderList<T extends object>(
  writer: Writer,
  format: OutputFormat | undefined,
  skills: T[],
  columns: ColumnDef<T>[],
): boolean {
  if (format === "json") {
    writer.write(JSON.stringify(skills, null, 2));
    return false;
  }
  if (format === "csv") {
    writer.write(renderAsCSV(skills));
    return false;
  }
  if (skills.length === 0) {
    writer.warn("No skills found.");
    return false;
  }

  writer.write(chalk.green(`Found ${skills.length} skill(s):\n`));
  writer.write(formatTable(skills, columns));
  return true;
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

export const listCommand = defineCommand({
  loader: async () => list,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
    flags: {
      userDefined: {
        kind: "boolean",
        brief:
          "List your user-defined skills from the platform, instead of bundled skills",
        optional: true,
      },
      match: {
        kind: "parsed",
        parse: String,
        brief:
          "Filter skills by name/label or description substring (case-insensitive)",
        optional: true,
      },
      visibility: {
        kind: "enum",
        values: ["listed", "unlisted"],
        brief:
          "Filter by visibility, listed or unlisted (requires --user-defined)",
        optional: true,
      },
      limit: {
        kind: "parsed",
        parse: parseLimit,
        brief: `Maximum number of skills to return, ${MIN_LIMIT}-${MAX_LIMIT} (requires --user-defined; default ${DEFAULT_LIMIT})`,
        optional: true,
      },
      offset: {
        kind: "parsed",
        parse: parseNonNegativeInt,
        brief:
          "Offset for pagination, skip this many results (requires --user-defined)",
        optional: true,
      },
      sort: {
        kind: "parsed",
        parse: String,
        brief:
          "Sort by field, e.g. label or updatedAt; prefix with - for descending (requires --user-defined)",
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
    },
    aliases: {
      m: "match",
      l: "limit",
      s: "sort",
    },
  },
  docs: {
    brief:
      "List AI agent skills (bundled by default, or user-defined with --user-defined)",
  },
});
