/**
 * Fetch Observe-curated ("bundled") skills from the public `observeinc/skills`
 * repo.
 *
 * A bundled skill is a whole directory — `skills/<name>/SKILL.md` plus any
 * `references/` files it links to. This initial implementation fetches only
 * the SKILL.md (a single raw GET) to unblock a near-term use case; it is not
 * the permanent shape and will grow to fetch the full skill directory.
 *
 * We fetch raw files directly rather than via the GitHub API to avoid its
 * 60 req/hr unauthenticated rate limit — see github-release.ts for the same
 * pattern.
 */
import { parseSkillMarkdown, type ParsedSkill } from "./parse";
import { GITHUB_SKILLS_RAW_BASE } from "../constants";

// Skill names map directly into the fetch URL path, so restrict them to the
// repo's own `skills/<name>/` directory naming to avoid path traversal.
const SKILL_NAME_PATTERN = /^[a-z0-9-]+$/;

/**
 * Fetch and parse a bundled skill's SKILL.md. Returns `null` when the skill
 * does not exist (404); throws on an invalid name, a non-ok response, or a
 * SKILL.md missing required frontmatter.
 */
export async function fetchBundledSkill(
  name: string,
  opts: { signal?: AbortSignal } = {},
): Promise<ParsedSkill | null> {
  if (!SKILL_NAME_PATTERN.test(name)) {
    throw new Error(
      `Invalid skill name: ${name} (expected lowercase letters, digits, and hyphens)`,
    );
  }

  const response = await fetch(`${GITHUB_SKILLS_RAW_BASE}/${name}/SKILL.md`, {
    signal: opts.signal,
  });

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(
      `Failed to fetch bundled skill ${name}: HTTP ${String(response.status)}`,
    );
  }

  return parseSkillMarkdown(await response.text());
}
