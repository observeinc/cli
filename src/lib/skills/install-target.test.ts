import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { detectAgents, type Agent } from "./agents";
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
  let cwd: string;

  beforeEach(() => {
    home = tmp("detect");
    cwd = tmp("detect-repo");
  });
  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
    rmSync(cwd, { recursive: true, force: true });
  });

  const names = (agents: Agent[]) => agents.map((a) => a.name);

  test("detects only agents whose skills dir exists", () => {
    mkdirSync(join(home, ".claude", "skills"), { recursive: true });
    mkdirSync(join(home, ".config", "opencode", "skills"), { recursive: true });
    // A config home with no skills dir counts as no agent: creating the dir is
    // what used to fail outright on a config home the user cannot write.
    mkdirSync(join(home, ".codex"), { recursive: true });

    expect(names(detectAgents({ home, cwd }))).toEqual([
      "Claude Code",
      "opencode",
    ]);
  });

  test("project mode detects on the repo-local dir, not the global one", () => {
    // Both agents are set up globally, but only Claude Code's dir is in the repo.
    mkdirSync(join(home, ".claude", "skills"), { recursive: true });
    mkdirSync(join(home, ".roo", "skills"), { recursive: true });
    mkdirSync(join(cwd, ".claude", "skills"), { recursive: true });

    expect(names(detectAgents({ home, cwd, project: true }))).toEqual([
      "Claude Code",
    ]);
  });
});

describe("installSkill — global", () => {
  let home: string;

  beforeEach(() => {
    home = tmp("global");
    // Two detected agents.
    mkdirSync(join(home, ".claude", "skills"), { recursive: true });
    mkdirSync(join(home, ".cursor", "skills"), { recursive: true });
  });
  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
  });

  test("writes a canonical copy and symlinks it into each detected agent", () => {
    const agents = detectAgents({ home });
    const { installed, skipped } = installSkill({
      name: "demo",
      files: FILES,
      agents,
      home,
    });

    const canonical = join(home, ".agents", "skills", "demo");
    expect(installed[0]).toEqual({ path: canonical, kind: "canonical" });
    expect(decode(join(canonical, "SKILL.md"))).toContain("name: demo");
    expect(decode(join(canonical, "references", "opal.md"))).toBe("# ref\n");

    const claudeLink = join(home, ".claude", "skills", "demo");
    const cursorLink = join(home, ".cursor", "skills", "demo");
    expect(installed.slice(1)).toEqual([
      { path: claudeLink, kind: "symlink" },
      { path: cursorLink, kind: "symlink" },
    ]);
    expect(skipped).toEqual([]);
    // The links are symlinks that resolve to the canonical dir and its files.
    expect(lstatSync(claudeLink).isSymbolicLink()).toBe(true);
    expect(readlinkSync(claudeLink)).toBe(canonical);
    expect(decode(join(claudeLink, "SKILL.md"))).toContain("name: demo");
  });

  test("copies the directory when symlinking is rejected (Windows fallback)", () => {
    const agents = detectAgents({ home });
    const { installed } = installSkill({
      name: "demo",
      files: FILES,
      agents,
      home,
      // Windows without developer mode or admin rights, as Node reports it.
      symlink: () => {
        throw Object.assign(new Error("EPERM: operation not permitted"), {
          code: "EPERM",
        });
      },
    });

    const claudeTarget = join(home, ".claude", "skills", "demo");
    expect(installed.find((p) => p.path === claudeTarget)?.kind).toBe("copy");
    // A real directory copy, not a symlink.
    expect(lstatSync(claudeTarget).isSymbolicLink()).toBe(false);
    expect(lstatSync(claudeTarget).isDirectory()).toBe(true);
    expect(decode(join(claudeTarget, "references", "opal.md"))).toBe("# ref\n");
  });

  test("skips an unwritable agent dir, leaving nothing behind, and installs the rest", () => {
    // A read-only agent skills dir used to abort the whole run, leaving the
    // agents after it in the list with nothing. The symlink is what fails here,
    // and a permission failure earns no copy fallback — that would fail too, so
    // the reported reason is the symlink's own and the dir is left untouched.
    const cursorSkills = join(home, ".cursor", "skills");
    chmodSync(cursorSkills, 0o500);
    try {
      const agents = detectAgents({ home });
      const { installed, skipped } = installSkill({
        name: "demo",
        files: FILES,
        agents,
        home,
      });

      const claudeLink = join(home, ".claude", "skills", "demo");
      expect(installed.map((p) => p.path)).toEqual([
        join(home, ".agents", "skills", "demo"),
        claudeLink,
      ]);
      expect(lstatSync(claudeLink).isSymbolicLink()).toBe(true);

      expect(skipped).toHaveLength(1);
      expect(skipped[0]!.path).toBe(join(cursorSkills, "demo"));
      expect(skipped[0]!.reason).toContain("EACCES");
      expect(skipped[0]!.reason).toContain("symlink");
      expect(existsSync(join(cursorSkills, "demo"))).toBe(false);
    } finally {
      // Restore write permission so afterEach can remove the temp home.
      chmodSync(cursorSkills, 0o700);
    }
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
    // Claude Code and Cursor are both set up globally; the repo has Claude's
    // project dir. Cursor's project dir is the canonical `.agents/skills`.
    mkdirSync(join(home, ".claude", "skills"), { recursive: true });
    mkdirSync(join(home, ".cursor", "skills"), { recursive: true });
    mkdirSync(join(cwd, ".claude", "skills"), { recursive: true });
  });
  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
    rmSync(cwd, { recursive: true, force: true });
  });

  test("writes canonical under the repo and skips the agent whose dir is canonical", () => {
    const agents = detectAgents({ home, cwd, project: true });
    const { installed } = installSkill({
      name: "demo",
      files: FILES,
      project: true,
      agents,
      home,
      cwd,
    });

    const canonical = join(cwd, ".agents", "skills", "demo");
    expect(installed[0]).toEqual({ path: canonical, kind: "canonical" });
    expect(decode(join(canonical, "SKILL.md"))).toContain("name: demo");

    // Claude's project dir gets a symlink; Cursor's project dir *is* the
    // canonical `.agents/skills`, so it is skipped (no duplicate entry).
    const claudeLink = join(cwd, ".claude", "skills", "demo");
    expect(installed.slice(1)).toEqual([{ path: claudeLink, kind: "symlink" }]);
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
