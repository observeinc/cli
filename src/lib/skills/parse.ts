import matter from "gray-matter";

/**
 * A skill parsed from its SKILL.md: standard frontmatter fields plus the
 * markdown body. Not specific to any one skill source — bundled skills use it
 * now, and installing / reading skills from the local filesystem will use it
 * later — so it lives here rather than beside a particular source.
 */
export interface ParsedSkill {
  /** `name` frontmatter field (required). */
  name: string;
  /** `description` frontmatter field (required). */
  description: string;
  /** `user-invocable` frontmatter field, if present (default: true). */
  userInvocable?: boolean;
  /** `disable-model-invocation` frontmatter field, if present (default: false). */
  disableModelInvocation?: boolean;
  /** Markdown body after the frontmatter block. */
  body: string;
  /** The full, unmodified SKILL.md (frontmatter + body). */
  raw: string;
}

/**
 * Parse a SKILL.md into its frontmatter fields and markdown body. Throws if the
 * required `name` or `description` frontmatter fields are missing — a document
 * lacking either is not a valid skill.
 */
export function parseSkillMarkdown(raw: string): ParsedSkill {
  const { data, content } = matter(raw);
  const fm = data as Record<string, unknown>;

  if (typeof fm.name !== "string" || !fm.name) {
    throw new Error('Invalid skill: missing "name" frontmatter field');
  }
  if (typeof fm.description !== "string" || !fm.description) {
    throw new Error('Invalid skill: missing "description" frontmatter field');
  }

  return {
    name: fm.name,
    description: fm.description.trim(),
    userInvocable: boolField(fm["user-invocable"]),
    disableModelInvocation: boolField(fm["disable-model-invocation"]),
    body: content,
    raw,
  };
}

/** Return a frontmatter value only when it is a boolean, else undefined. */
function boolField(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}
