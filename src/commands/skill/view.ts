import { buildCommand } from "@stricli/core";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { getSkill } from "../../rest/skill/get-skill";
import { SkillVisibility } from "../../rest/generated";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import { renderObject } from "../../lib/formatters/object";
import { renderAsCSV } from "../../lib/formatters/csv";

type OutputFormat = "json" | "csv";

interface ViewSkillFlags {
  format?: OutputFormat;
  json?: boolean;
  content?: boolean;
}

async function view(
  this: LocalContext,
  flags: ViewSkillFlags,
  skillId: string,
): Promise<void> {
  const format = flags.json ? ("json" as const) : flags.format;
  const { process, writer: _writer } = this;
  const isStructuredOutput =
    format === "json" || format === "csv" || flags.content === true;
  const writer = muteStatusWriter(_writer, { muted: isStructuredOutput });

  try {
    const config = loadConfig();

    writer.info("Fetching skill...");

    const skill = await getSkill({ config, skillId });

    if (!skill) {
      writer.error(`Skill not found: ${skillId}`);
      process.exit(1);
      return;
    }

    if (format === "json") {
      writer.write(JSON.stringify(skill, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(skill));
      return;
    }

    if (flags.content) {
      writer.write(skill.content ?? "");
      return;
    }

    writer.write("");
    writer.write(chalk.bold.white(`Skill ${skill.label}`));
    writer.write(
      skill.visibility === SkillVisibility.Listed
        ? chalk.green(skill.visibility)
        : chalk.dim(skill.visibility),
    );

    const data = {
      id: skill.id,
      label: skill.label,
      description: skill.description,
      visibility: skill.visibility,
      createdBy: skill.createdBy.label ?? skill.createdBy.id,
      createdAt: skill.createdAt,
      updatedBy: skill.updatedBy.label ?? skill.updatedBy.id,
      updatedAt: skill.updatedAt,
    };

    renderObject(data, (text) => writer.write(text));

    if (skill.content) {
      writer.write(chalk.bold("Content"));
      writer.write(chalk.dim("-".repeat(60)));
      writer.write(skill.content);
      writer.write("");
    }
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exit(1);
  }
}

export const viewCommand = buildCommand({
  loader: async () => view,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        {
          brief: "Skill ID",
          parse: String,
        },
      ],
    },
    flags: {
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
    brief: "View details of an AI agent skill",
  },
});
