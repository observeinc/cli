import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../test-helpers";
import { SkillVisibility, type SkillResource } from "../../rest/generated";
import type { BundledRepo } from "../../lib/skills/bundled-repo";
import type { Agent } from "../../lib/skills/agents";
import type { InstalledPath } from "../../lib/skills/install-target";
import { installSkills } from "./install";

const HOME = "/fake/home";
const CWD = "/fake/repo";

const loadConfigFn = mock(() => ({
  customerId: "c",
  token: "t",
  domain: "observeinc.com",
}));

const fakeRepo: BundledRepo = { skillsDir: "/tmp/fake/skills", etag: '"v1"' };
const getBundledRepoFn = mock(() => Promise.resolve(fakeRepo));

let catalogToReturn: { name: string; description: string }[];
const listBundledCatalogFn = mock(() => catalogToReturn);

// Bundled names in this set resolve to an empty file set (i.e. "not found").
let missingBundled: Set<string>;
let bundledFilesToReturn: Map<string, Uint8Array>;
const readBundledSkillFilesFn = mock((_repo: BundledRepo, name: string) =>
  missingBundled.has(name)
    ? new Map<string, Uint8Array>()
    : bundledFilesToReturn,
);

let skillToReturn: SkillResource | null;
const getSkillFn = mock((args: { config: unknown; skillId: string }) =>
  Promise.resolve(
    skillToReturn
      ? { ...skillToReturn, id: args.skillId, label: `Skill ${args.skillId}` }
      : skillToReturn,
  ),
);

let listToReturn: SkillResource[];
const listSkillsFn = mock(() => Promise.resolve({ skills: listToReturn }));

const fakeAgents: Agent[] = [
  {
    name: "Claude Code",
    globalSkillsDir: `${HOME}/.claude/skills`,
    projectSkillsDir: ".claude/skills",
  },
];
const detectAgentsFn = mock(() => fakeAgents);

// A deterministic stand-in for the real filesystem writer: one canonical path
// plus one agent symlink, derived from the call's name/project.
const installSkillFn = mock(
  (args: { name: string; project?: boolean }): InstalledPath[] => {
    const root = args.project
      ? `${CWD}/.agents/skills`
      : `${HOME}/.agents/skills`;
    const link = args.project
      ? `${CWD}/.claude/skills`
      : `${HOME}/.claude/skills`;
    return [
      { path: `${root}/${args.name}`, kind: "canonical" },
      { path: `${link}/${args.name}`, kind: "symlink" },
    ];
  },
);

function skillStub(): SkillResource {
  return {
    id: "0",
    label: "Team Triage",
    description: "runbook",
    visibility: SkillVisibility.Listed,
    createdBy: { id: "u-1", label: "Alice" },
    createdAt: "2026-07-01T00:00:00Z",
    updatedBy: { id: "u-1", label: "Alice" },
    updatedAt: "2026-07-01T00:00:00Z",
    content: "# body",
  };
}

const deps = {
  loadConfig: loadConfigFn,
  getBundledRepo: getBundledRepoFn,
  listBundledCatalog: listBundledCatalogFn,
  readBundledSkillFiles: readBundledSkillFilesFn,
  getSkill: getSkillFn,
  listSkills: listSkillsFn,
  detectAgents: detectAgentsFn,
  installSkill: installSkillFn,
  home: HOME,
  cwd: CWD,
} as unknown as Parameters<typeof installSkills>[3];

suppressAnsiColor();

beforeEach(() => {
  for (const m of [
    getBundledRepoFn,
    listBundledCatalogFn,
    readBundledSkillFilesFn,
    getSkillFn,
    listSkillsFn,
    detectAgentsFn,
    installSkillFn,
  ]) {
    m.mockClear();
  }
  catalogToReturn = [
    { name: "alert-investigation", description: "Investigate an alert" },
    { name: "generate-opal", description: "Core OPAL" },
  ];
  missingBundled = new Set();
  bundledFilesToReturn = new Map([["SKILL.md", new Uint8Array([1])]]);
  skillToReturn = skillStub();
  listToReturn = [
    { ...skillStub(), id: "1" },
    { ...skillStub(), id: "2" },
  ];
});

describe("skill install — errors", () => {
  test("no skill and no --all errors and sets exit code 1", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    await installSkills(context, {}, [], deps);

    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("specify a skill name (or --all)");
    expect(getBundledRepoFn).not.toHaveBeenCalled();
    expect(installSkillFn).not.toHaveBeenCalled();
  });

  test("a missing bundled skill errors with Skill not found", async () => {
    missingBundled = new Set(["nope"]);
    const { context, stderr, getExitCode } = createMockContext();
    await installSkills(context, {}, ["nope"], deps);

    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Skill not found: nope");
    expect(installSkillFn).not.toHaveBeenCalled();
  });

  test("one unknown name among several fails without installing any", async () => {
    missingBundled = new Set(["nope", "nada"]);
    const { context, stderr, getExitCode } = createMockContext();
    await installSkills(
      context,
      {},
      ["alert-investigation", "nope", "nada"],
      deps,
    );

    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Skills not found: nope, nada");
    // Fail fast: nothing is installed when any requested name is unknown.
    expect(installSkillFn).not.toHaveBeenCalled();
  });
});

describe("skill install — bundled (default)", () => {
  test("installs one bundled skill and reports the canonical dir + link dirs", async () => {
    const { context, stdout } = createMockContext();
    await installSkills(context, {}, ["alert-investigation"], deps);

    expect(readBundledSkillFilesFn).toHaveBeenCalledWith(
      fakeRepo,
      "alert-investigation",
    );
    expect(getSkillFn).not.toHaveBeenCalled();
    // installSkill got the resolved files, the detected agents, and mode.
    const call = installSkillFn.mock.calls[0]![0] as {
      name: string;
      project?: boolean;
      agents: Agent[];
    };
    expect(call.name).toBe("alert-investigation");
    expect(call.project).toBe(false);
    expect(call.agents).toBe(fakeAgents);

    const out = stdout.join("");
    expect(out).toContain("Installed 1 skill to ~/.agents/skills:");
    expect(out).toContain("  alert-investigation");
    // Directories only — no per-skill paths.
    expect(out).toContain("Symlinked into ~/.claude/skills.");
    expect(out).not.toContain("~/.agents/skills/alert-investigation");
  });

  test("installs multiple named skills, listing every name once", async () => {
    const { context, stdout } = createMockContext();
    await installSkills(
      context,
      {},
      ["alert-investigation", "generate-opal"],
      deps,
    );

    expect(installSkillFn).toHaveBeenCalledTimes(2);
    const out = stdout.join("");
    expect(out).toContain("Installed 2 skills to ~/.agents/skills:");
    expect(out).toContain("  alert-investigation");
    expect(out).toContain("  generate-opal");
    expect(out).toContain("Symlinked into ~/.claude/skills.");
  });

  test("--all uses the same output shape as an explicit list", async () => {
    const { context, stdout } = createMockContext();
    await installSkills(context, { all: true }, [], deps);

    expect(installSkillFn).toHaveBeenCalledTimes(2);
    const out = stdout.join("");
    expect(out).toContain("Installed 2 skills to ~/.agents/skills:");
    expect(out).toContain("  alert-investigation");
    expect(out).toContain("  generate-opal");
    expect(out).toContain("Symlinked into ~/.claude/skills.");
  });
});

describe("skill install — user-defined", () => {
  test("installs a user-defined skill by id, under its slugified label", async () => {
    const { context, stdout } = createMockContext();
    await installSkills(context, { userDefined: true }, ["7291"], deps);

    expect(getSkillFn).toHaveBeenCalledTimes(1);
    expect(getBundledRepoFn).not.toHaveBeenCalled();
    // Label "Skill 7291" slugifies to "skill-7291".
    expect((installSkillFn.mock.calls[0]![0] as { name: string }).name).toBe(
      "skill-7291",
    );
    expect(stdout.join("")).toContain("  skill-7291");
  });

  test("--all --user-defined installs every user-defined skill", async () => {
    const { context, stdout } = createMockContext();
    await installSkills(context, { all: true, userDefined: true }, [], deps);

    expect(listSkillsFn).toHaveBeenCalledTimes(1);
    expect(getSkillFn).toHaveBeenCalledTimes(2); // content fetched per id
    expect(installSkillFn).toHaveBeenCalledTimes(2);

    const out = stdout.join("");
    expect(out).toContain("Installed 2 skills to ~/.agents/skills:");
    expect(out).toContain("  skill-1");
    expect(out).toContain("  skill-2");
  });
});

describe("skill install — project", () => {
  test("--project reports the repo-local dir and per-agent project dirs", async () => {
    const { context, stdout } = createMockContext();
    await installSkills(
      context,
      { project: true },
      ["alert-investigation"],
      deps,
    );

    expect(
      (installSkillFn.mock.calls[0]![0] as { project?: boolean }).project,
    ).toBe(true);
    const out = stdout.join("");
    expect(out).toContain("Installed 1 skill to ./.agents/skills:");
    expect(out).toContain("  alert-investigation");
    expect(out).toContain("Symlinked into ./.claude/skills.");
  });
});
