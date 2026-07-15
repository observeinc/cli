import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { getSkill } from "../../rest/skill/get-skill";
import { fetchBundledSkill } from "../../lib/skills/bundled";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter, type Writer } from "../../lib/writer";
import { renderObject } from "../../lib/formatters/object";
import { renderAsCSV } from "../../lib/formatters/csv";

type OutputFormat = "json" | "csv";

interface ViewSkillFlags {
  format?: OutputFormat;
  json?: boolean;
  content?: boolean;
  userDefined?: boolean;
}

export interface ViewSkillDeps {
  loadConfig?: typeof loadConfig;
  fetchBundledSkill?: typeof fetchBundledSkill;
}

/**
 * A skill normalized for rendering, so the output modes below work the same
 * whether the skill came from the REST API (user-defined) or the public repo
 * (bundled). Only the data differs between sources; the dispatch does not.
 */
interface SkillView {
  /** Heading shown after "Skill ". */
  heading: string;
  /** Fields rendered as the Details table. */
  details: object;
  /** Body shown in the Content section; omitted when empty. */
  body?: string;
  /** Raw content emitted by `--content`. */
  content: string;
  /** Payload serialized by `--json` / `--csv`. */
  record: object;
}

export async function view(
  this: LocalContext,
  flags: ViewSkillFlags,
  skill: string,
  deps: ViewSkillDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    fetchBundledSkill: fetchBundledSkillImpl = fetchBundledSkill,
  } = deps;
  const format = flags.json ? ("json" as const) : flags.format;
  const { process, writer: _writer } = this;
  const isStructuredOutput =
    format === "json" || format === "csv" || flags.content === true;
  const writer = muteStatusWriter(_writer, { muted: isStructuredOutput });

  try {
    writer.info("Fetching skill...");

    // Skills are bundled (fetched by name from the public repo) by default;
    // --user-defined looks up a user-defined skill by id via the REST API.
    const skillView = flags.userDefined
      ? await loadUserDefinedSkillView(skill, loadConfigImpl)
      : await loadBundledSkillView(skill, fetchBundledSkillImpl);

    if (!skillView) {
      writer.error(`Skill not found: ${skill}`);
      process.exitCode = 1;
      return;
    }

    renderSkill(writer, { format, content: flags.content === true }, skillView);
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exitCode = 1;
  }
}

async function loadUserDefinedSkillView(
  skillId: string,
  loadConfigImpl: typeof loadConfig,
): Promise<SkillView | null> {
  const skill = await getSkill({ config: loadConfigImpl(), skillId });
  if (!skill) return null;

  return {
    heading: skill.label,
    details: {
      id: skill.id,
      label: skill.label,
      description: skill.description,
      visibility: skill.visibility,
      createdBy: skill.createdBy.label ?? skill.createdBy.id,
      createdAt: skill.createdAt,
      updatedBy: skill.updatedBy.label ?? skill.updatedBy.id,
      updatedAt: skill.updatedAt,
    },
    body: skill.content,
    content: skill.content ?? "",
    record: skill,
  };
}

async function loadBundledSkillView(
  name: string,
  fetchBundledSkillImpl: typeof fetchBundledSkill,
): Promise<SkillView | null> {
  const skill = await fetchBundledSkillImpl(name);
  if (!skill) return null;

  // `--content` and `record.content` expose the body (the instructions to
  // follow), matching user-defined skills whose content is likewise just the
  // body. The frontmatter is invocation metadata, surfaced as separate fields.
  // The full SKILL.md (`skill.raw`) is kept for a future install command.
  const record = {
    name: skill.name,
    description: skill.description,
    content: skill.body,
  };
  return {
    heading: skill.name,
    details: { name: skill.name, description: skill.description },
    body: skill.body || undefined,
    content: skill.body,
    record,
  };
}

function renderSkill(
  writer: Writer,
  { format, content }: { format?: OutputFormat; content: boolean },
  view: SkillView,
): void {
  if (format === "json") {
    writer.write(JSON.stringify(view.record, null, 2));
    return;
  }
  if (format === "csv") {
    writer.write(renderAsCSV(view.record));
    return;
  }
  if (content) {
    writer.write(view.content);
    return;
  }

  writer.write("");
  writer.write(chalk.bold.white(`Skill ${view.heading}`));
  writer.write("");
  renderObject(view.details, (text) => writer.write(text));
  if (view.body) {
    writer.write(chalk.bold("Content"));
    writer.write(chalk.dim("-".repeat(60)));
    writer.write(view.body);
    writer.write("");
  }
}

export const viewCommand = defineCommand({
  loader: async () => view,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        {
          placeholder: "skill",
          brief:
            "Bundled skill name, or user-defined skill id (with --user-defined)",
          parse: String,
        },
      ],
    },
    flags: {
      userDefined: {
        kind: "boolean",
        brief:
          "Fetch a user-defined skill by id from the platform, instead of a bundled skill by name",
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
      content: {
        kind: "boolean",
        brief: "Print only the raw skill content (markdown body)",
        optional: true,
      },
    },
    aliases: {},
  },
  docs: {
    brief:
      "View an AI agent skill (bundled by default, or user-defined with --user-defined)",
  },
});
