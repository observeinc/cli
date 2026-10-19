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

const REFERENCE_PATHS = [
  "references/add-checklist.md",
  "references/change-checklist.md",
  "references/eval-routes.md",
  "references/docs-delta.md",
];

const DOCS_DELTA_NOTION_URL =
  "https://app.notion.com/p/observeinc/Running-MCP-CLI-evals-3bb770a806fc812fa95ddbc13a288821";

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

// Any URL scheme (https:, http:, mailto:, ...), so non-https links are
// recognized as external rather than mistakenly resolved as local files.
const URL_SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;

function markdownLinkTargets(content: string): string[] {
  const targets: string[] = [];
  const inlineRe = /\[[^\]]*\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = inlineRe.exec(content)) !== null) {
    const href = match[1];
    if (href) {
      targets.push(href.trim());
    }
  }
  // Autolinks: a URL (any scheme) or a relative path, e.g. `<https://x>`,
  // `<../x.md>`, `<./x.md>`, `<#anchor>`. Deliberately excludes bare
  // placeholder tokens like `<resource>` or `<command>` (not links), and bare
  // absolute paths (`\/`, dropped — it also matched HTML closing tags like
  // `</details>`; absolute inline links are already caught by `inlineRe`).
  const autolinkRe = /<((?:[a-z][a-z0-9+.-]*:|\.{1,2}\/|#)[^<>\s]*)>/gi;
  while ((match = autolinkRe.exec(content)) !== null) {
    const href = match[1];
    if (href) {
      targets.push(href.trim());
    }
  }
  // Reference-style link definitions, e.g. `[agents]: ../../../AGENTS.md`
  // used elsewhere as `[see][agents]`. Excludes GFM footnote definitions
  // (`[^1]: ...`), which share the same syntax but aren't links.
  const definitionRe = /^\s*\[(?!\^)[^\]]+\]:\s*(\S+)/gm;
  while ((match = definitionRe.exec(content)) !== null) {
    const href = match[1];
    if (href) {
      targets.push(href.trim());
    }
  }
  return targets;
}

/** Strip a markdown link target down to its path, dropping an optional
 * trailing title (`eval-routes.md "Routes"` -> `eval-routes.md`). */
function stripLinkTitle(target: string): string {
  const match = /^(\S+)(?:\s+(?:"[^"]*"|'[^']*'))?$/.exec(target);
  return match?.[1] ?? target;
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

    for (const refPath of REFERENCE_PATHS) {
      expect(body).toContain(refPath);
    }
    expect(body).toMatch(/docs-delta\.md.*notion|notion.*docs-delta\.md/is);
    expect(body).toMatch(/eval-routes\.md.*(source of truth|command source)/is);
    expect(body).toMatch(/prettier/i);
    expect(body).toMatch(/make evals-run-all SURFACE=observe-cli/i);
    expect(body).toMatch(/not the how-to|is not the how-to/i);

    const docsDeltaPath = join(SKILL_DIR, "references/docs-delta.md");
    expect(markdownLinkTargets(readFileSync(docsDeltaPath, "utf-8"))).toContain(
      DOCS_DELTA_NOTION_URL,
    );

    for (const mdPath of listMarkdownFiles(SKILL_DIR)) {
      const content = readFileSync(mdPath, "utf-8");
      for (const rawTarget of markdownLinkTargets(content)) {
        if (URL_SCHEME_RE.test(rawTarget)) {
          continue;
        }
        const target = stripLinkTitle(rawTarget);
        const pathPart = target.split("#")[0] ?? target;
        const resolved = resolve(join(mdPath, ".."), pathPart);
        const rel = relative(SKILL_DIR, resolved);
        // Catches every link that actually leaves the skill directory
        // (`../../AGENTS.md`, absolute paths, ...). A bare `../` prefix is
        // not itself a violation -- e.g. `../SKILL.md` from a references/
        // page stays inside SKILL_DIR and must be allowed.
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

describe("markdownLinkTargets", () => {
  test("picks up reference-style link definitions", () => {
    const content =
      "See [agents][agents] for details.\n\n[agents]: ../../../AGENTS.md\n";
    expect(markdownLinkTargets(content)).toContain("../../../AGENTS.md");
  });

  test("picks up non-https angle-bracket links but not bare placeholders", () => {
    const content = "See <../x.md> for `<resource>` and `<command>` names.\n";
    const targets = markdownLinkTargets(content);
    expect(targets).toContain("../x.md");
    expect(targets).not.toContain("resource");
    expect(targets).not.toContain("command");
  });

  test("does not treat HTML closing tags as absolute-path links", () => {
    const content = "<details>\n<summary>More</summary>\ntext\n</details>\n";
    const targets = markdownLinkTargets(content);
    expect(targets).not.toContain("/details");
    expect(targets).not.toContain("/summary");
  });

  test("does not treat GFM footnote definitions as link targets", () => {
    const content = "See the note.[^1]\n\n[^1]: Harbor runs nightly\n";
    const targets = markdownLinkTargets(content);
    expect(targets).not.toContain("Harbor");
  });
});

describe("link-target validation helpers", () => {
  test("URL_SCHEME_RE matches any scheme, not just https", () => {
    for (const url of [
      "https://example.com",
      "http://example.com",
      "mailto:a@b.com",
    ]) {
      expect(URL_SCHEME_RE.test(url)).toBe(true);
    }
    expect(URL_SCHEME_RE.test("eval-routes.md")).toBe(false);
  });

  test("stripLinkTitle drops an optional trailing title", () => {
    expect(stripLinkTitle('eval-routes.md "Routes"')).toBe("eval-routes.md");
    expect(stripLinkTitle("eval-routes.md 'Routes'")).toBe("eval-routes.md");
    expect(stripLinkTitle("eval-routes.md")).toBe("eval-routes.md");
  });
});
