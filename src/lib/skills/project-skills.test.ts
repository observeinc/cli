import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import matter from "gray-matter";
import { parseSkillMarkdown } from "./parse";

const REPO_ROOT = process.cwd();
const SKILL_DIR = join(REPO_ROOT, ".agents/skills/cli-command-lifecycle");
const SKILL_MD = join(SKILL_DIR, "SKILL.md");
const AGENTS_MD = join(REPO_ROOT, "AGENTS.md");

const DECISION_KEYS = [
  "mode",
  "command",
  "resource",
  "maturity",
  "change-class",
  "grading-criteria",
  "iterations",
];

const REFERENCE_LINKS: Record<string, string> = {
  "references/add-checklist.md": "add",
  "references/change-checklist.md": "change",
  "references/eval-routes.md": "eval",
  "references/docs-delta.md": "notion",
};

function listMarkdownFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listMarkdownFiles(full));
    } else if (entry.endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

function markdownLinkTargets(content: string): string[] {
  const targets: string[] = [];
  const re = /\[[^\]]*\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    const href = match[1];
    if (href) {
      targets.push(href.trim());
    }
  }
  return targets;
}

describe("cli-command-lifecycle project skill", () => {
  test("SKILL.md frontmatter, body contract, and link integrity", () => {
    expect(existsSync(SKILL_MD)).toBe(true);

    const raw = readFileSync(SKILL_MD, "utf-8");
    const lines = raw.split("\n");
    expect(lines.length).toBeLessThanOrEqual(500);

    const parsed = parseSkillMarkdown(raw);
    expect(parsed.name).toBe("cli-command-lifecycle");
    expect(parsed.description).not.toContain("\n");
    expect(parsed.description.length).toBeGreaterThan(0);

    const { data } = matter(raw);
    const metadata = data.metadata as { internal?: boolean } | undefined;
    expect(metadata?.internal).toBe(true);

    const body = parsed.body;
    for (const key of DECISION_KEYS) {
      expect(body).toContain(key);
    }
    expect(body).toMatch(/before eval/i);

    for (const refPath of Object.keys(REFERENCE_LINKS)) {
      expect(body).toContain(refPath);
    }
    expect(body).toMatch(/docs-delta\.md.*notion|notion.*docs-delta\.md/is);
    expect(body).toMatch(/eval-routes\.md.*(source of truth|command source)/is);
    expect(body).toMatch(/prettier/i);
    expect(body).toMatch(/make evals-run-all SURFACE=observe-cli/i);
    expect(body).toMatch(/not the how-to|is not the how-to/i);

    for (const mdPath of listMarkdownFiles(SKILL_DIR)) {
      const content = readFileSync(mdPath, "utf-8");
      for (const target of markdownLinkTargets(content)) {
        expect(target).not.toMatch(/^https?:\/\//);
        expect(target).not.toMatch(/^\.\.\//);
        const pathPart = target.split("#")[0] ?? target;
        const resolved = resolve(join(mdPath, ".."), pathPart);
        const rel = relative(SKILL_DIR, resolved);
        expect(rel.startsWith("..")).toBe(false);
        expect(existsSync(resolved)).toBe(true);
      }
    }
  });

  test("AGENTS.md points at the skill and drops duplicate recipes", () => {
    const agents = readFileSync(AGENTS_MD, "utf-8");
    expect(agents).not.toContain("### Adding a New Command");
    expect(agents).not.toContain("### Adding an Experimental Command");
    expect(agents).toContain(".agents/skills/cli-command-lifecycle/SKILL.md");
    expect(agents).toContain("### Adding or changing a command");
  });
});
