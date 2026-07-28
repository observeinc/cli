import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { detectAgents } from "./agents";
import {
  installSkill,
  slugifyLabel,
  synthesizeUserSkill,
} from "./install-target";
import { parseSkillMarkdown } from "./parse";
import { SkillVisibility, type SkillResource } from "../../rest/generated";

/** A fresh, unique temp directory under /tmp. */
function tmp(label: string): string {
  const dir = join(
    "/tmp",
    `observe-install-target-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

const FILES = new Map<string, Uint8Array>([
  [
    "SKILL.md",
    new TextEncoder().encode("---\nname: demo\ndescription: d\n---\nbody\n"),
  ],
  ["references/opal.md", new TextEncoder().encode("# ref\n")],
]);

const decode = (path: string) => readFileSync(path, "utf-8");

describe("detectAgents", () => {
  let home: string;

  beforeEach(() => {
    home = tmp("detect");
  });
  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
  });

  test("detects only agents whose base dir exists", () => {
    // Claude's base is ~/.claude; opencode's is ~/.config/opencode.
    mkdirSync(join(home, ".claude"), { recursive: true });
    mkdirSync(join(home, ".config", "opencode"), { recursive: true });

    const names = detectAgents({ home }).map((a) => a.name);
    expect(names).toEqual(["Claude Code", "opencode"]);
  });
});

describe("installSkill — global", () => {
  let home: string;

  beforeEach(() => {
    home = tmp("global");
    // Two detected agents.
    mkdirSync(join(home, ".claude"), { recursive: true });
    mkdirSync(join(home, ".cursor"), { recursive: true });
  });
  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
  });

  test("writes a canonical copy and symlinks it into each detected agent", () => {
    const agents = detectAgents({ home });
    const paths = installSkill({ name: "demo", files: FILES, agents, home });

    const canonical = join(home, ".agents", "skills", "demo");
    expect(paths[0]).toEqual({ path: canonical, kind: "canonical" });
    expect(decode(join(canonical, "SKILL.md"))).toContain("name: demo");
    expect(decode(join(canonical, "references", "opal.md"))).toBe("# ref\n");

    const claudeLink = join(home, ".claude", "skills", "demo");
    const cursorLink = join(home, ".cursor", "skills", "demo");
    expect(paths.slice(1)).toEqual([
      { path: claudeLink, kind: "symlink" },
      { path: cursorLink, kind: "symlink" },
    ]);
    // The links are symlinks that resolve to the canonical dir and its files.
    expect(lstatSync(claudeLink).isSymbolicLink()).toBe(true);
    expect(readlinkSync(claudeLink)).toBe(canonical);
    expect(decode(join(claudeLink, "SKILL.md"))).toContain("name: demo");
  });

  test("copies the directory when symlinking is rejected (Windows fallback)", () => {
    const agents = detectAgents({ home });
    const paths = installSkill({
      name: "demo",
      files: FILES,
      agents,
      home,
      symlink: () => {
        throw new Error("EPERM");
      },
    });

    const claudeTarget = join(home, ".claude", "skills", "demo");
    expect(paths.find((p) => p.path === claudeTarget)?.kind).toBe("copy");
    // A real directory copy, not a symlink.
    expect(lstatSync(claudeTarget).isSymbolicLink()).toBe(false);
    expect(lstatSync(claudeTarget).isDirectory()).toBe(true);
    expect(decode(join(claudeTarget, "references", "opal.md"))).toBe("# ref\n");
  });

  test("re-installing rewrites the canonical dir, dropping removed files", () => {
    const agents = detectAgents({ home });
    installSkill({ name: "demo", files: FILES, agents, home });

    const canonical = join(home, ".agents", "skills", "demo");
    expect(existsSync(join(canonical, "references", "opal.md"))).toBe(true);

    // Re-install with just SKILL.md; the stale reference file must be gone.
    const trimmed = new Map([["SKILL.md", FILES.get("SKILL.md")!]]);
    installSkill({ name: "demo", files: trimmed, agents, home });
    expect(existsSync(join(canonical, "SKILL.md"))).toBe(true);
    expect(existsSync(join(canonical, "references", "opal.md"))).toBe(false);
  });

  test("refuses an empty name instead of wiping the skills root", () => {
    const agents = detectAgents({ home });
    installSkill({ name: "keep", files: FILES, agents, home });
    const other = join(home, ".agents", "skills", "keep", "SKILL.md");

    // An empty name would make join(root, "") collapse to the skills root and
    // rmSync it — the guard must reject it and leave existing installs intact.
    expect(() =>
      installSkill({ name: "", files: FILES, agents, home }),
    ).toThrow("Invalid skill name");
    expect(existsSync(other)).toBe(true);
  });
});

describe("installSkill — project", () => {
  let home: string;
  let cwd: string;

  beforeEach(() => {
    home = tmp("proj-home");
    cwd = tmp("proj-cwd");
    // Detect Claude (project dir .claude/skills) and Cursor (project dir
    // .agents/skills, which is the canonical dir itself).
    mkdirSync(join(home, ".claude"), { recursive: true });
    mkdirSync(join(home, ".cursor"), { recursive: true });
  });
  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
    rmSync(cwd, { recursive: true, force: true });
  });

  test("writes canonical under the repo and skips the agent whose dir is canonical", () => {
    const agents = detectAgents({ home });
    const paths = installSkill({
      name: "demo",
      files: FILES,
      project: true,
      agents,
      home,
      cwd,
    });

    const canonical = join(cwd, ".agents", "skills", "demo");
    expect(paths[0]).toEqual({ path: canonical, kind: "canonical" });
    expect(decode(join(canonical, "SKILL.md"))).toContain("name: demo");

    // Claude's project dir gets a symlink; Cursor's project dir *is* the
    // canonical `.agents/skills`, so it is skipped (no duplicate entry).
    const claudeLink = join(cwd, ".claude", "skills", "demo");
    expect(paths.slice(1)).toEqual([{ path: claudeLink, kind: "symlink" }]);
    expect(lstatSync(claudeLink).isSymbolicLink()).toBe(true);
  });
});

describe("slugifyLabel", () => {
  test.each([
    ["  My  Notes!  ", "my-notes"],
    ["ALL_CAPS_v2", "all-caps-v2"],
    ["--edge--", "edge"],
  ])("%p → %p", (input, expected) => {
    expect(slugifyLabel(input)).toBe(expected);
  });
});

describe("synthesizeUserSkill", () => {
  function stub(label = "Team Triage"): SkillResource {
    return {
      id: "7291",
      label,
      description: "Our internal triage runbook",
      visibility: SkillVisibility.Listed,
      createdBy: { id: "u-1", label: "Alice" },
      createdAt: "2026-07-01T00:00:00Z",
      updatedBy: { id: "u-1", label: "Alice" },
      updatedAt: "2026-07-01T00:00:00Z",
      content: "# Runbook\nStep one.",
    };
  }

  test("names the dir from the slug and emits a parseable SKILL.md", () => {
    const { name, files } = synthesizeUserSkill(stub());
    expect(name).toBe("team-triage");
    expect([...files.keys()]).toEqual(["SKILL.md"]);

    const parsed = parseSkillMarkdown(
      new TextDecoder().decode(files.get("SKILL.md")),
    );
    expect(parsed.name).toBe("team-triage");
    expect(parsed.description).toBe("Our internal triage runbook");
    expect(parsed.body.trim()).toBe("# Runbook\nStep one.");
  });

  test("throws when the label has no slug-able characters", () => {
    // An empty slug would otherwise name the dir "" and point installSkill's
    // rmSync at the skills root — this must fail loudly instead.
    expect(() => synthesizeUserSkill(stub("日本語 🎉"))).toThrow(
      "Cannot derive a skill directory name",
    );
  });
});
