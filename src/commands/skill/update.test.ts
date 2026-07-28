import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../test-helpers";
import { SkillVisibility, type SkillResource } from "../../rest/generated";
import type { BundledRepo } from "../../lib/skills/bundled-repo";
import type { Agent } from "../../lib/skills/agents";
import type { InstalledPath } from "../../lib/skills/install-target";
import { updateSkills } from "./update";

const HOME = "/fake/home";
const CWD = "/fake/repo";

const fakeRepo: BundledRepo = { skillsDir: "/tmp/fake/skills", etag: '"v1"' };
const getBundledRepoFn = mock(() => Promise.resolve(fakeRepo));

// name -> files for the bundled catalog; absent = not in catalog
let bundledFiles: Map<string, Map<string, Uint8Array>>;
const readBundledSkillFilesFn = mock(
  (_repo: BundledRepo, name: string) => bundledFiles.get(name) ?? new Map(),
);

const loadConfigFn = mock(() => ({
  customerId: "c",
  token: "t",
  domain: "observeinc.com",
}));

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

const installSkillFn = mock(
  (_args: {
    name: string;
    files: Map<string, Uint8Array>;
    project?: boolean;
    agents: Agent[];
    home?: string;
    cwd?: string;
  }): InstalledPath[] => [],
);

// name -> files on disk; absent = dir does not exist
let installedDirs: Map<string, Map<string, Uint8Array>>;

const readInstalledSkillFilesFn = mock((canonicalDir: string) => {
  const name = canonicalDir.split("/").at(-1)!;
  return installedDirs.get(name) ?? new Map<string, Uint8Array>();
});

const listInstalledSkillNamesFn = mock((_root: string) => [
  ...installedDirs.keys(),
]);

function skillStub(overrides: Partial<SkillResource> = {}): SkillResource {
  return {
    id: "1",
    label: "Alert Investigation",
    description: "runbook",
    visibility: SkillVisibility.Listed,
    createdBy: { id: "u-1", label: "Alice" },
    createdAt: "2026-07-01T00:00:00Z",
    updatedBy: { id: "u-1", label: "Alice" },
    updatedAt: "2026-07-01T00:00:00Z",
    content: "# body",
    ...overrides,
  };
}

const CURRENT_FILES = new Map([["SKILL.md", new Uint8Array([1, 2, 3])]]);
const STALE_FILES = new Map([["SKILL.md", new Uint8Array([9, 9, 9])]]);

const deps = {
  loadConfig: loadConfigFn,
  getBundledRepo: getBundledRepoFn,
  readBundledSkillFiles: readBundledSkillFilesFn,
  listSkills: listSkillsFn,
  detectAgents: detectAgentsFn,
  installSkill: installSkillFn,
  readInstalledSkillFiles: readInstalledSkillFilesFn,
  listInstalledSkillNames: listInstalledSkillNamesFn,
  home: HOME,
  cwd: CWD,
} as unknown as Parameters<typeof updateSkills>[3];

suppressAnsiColor();

beforeEach(() => {
  for (const m of [
    getBundledRepoFn,
    readBundledSkillFilesFn,
    loadConfigFn,
    listSkillsFn,
    detectAgentsFn,
    installSkillFn,
    readInstalledSkillFilesFn,
    listInstalledSkillNamesFn,
  ]) {
    m.mockClear();
  }

  bundledFiles = new Map([
    ["alert-investigation", CURRENT_FILES],
    ["generate-opal", CURRENT_FILES],
  ]);
  installedDirs = new Map([["alert-investigation", CURRENT_FILES]]);
  listToReturn = [skillStub()];
});

describe("skill update — bundled named", () => {
  test("up-to-date skill reports already up to date", async () => {
    const { context, stdout, getExitCode } = createMockContext();
    await updateSkills(context, {}, ["alert-investigation"], deps);

    expect(installSkillFn).not.toHaveBeenCalled();
    expect(stdout.join("")).toContain("All skills are up to date.");
    expect(getExitCode()).toBeUndefined();
  });

  test("outdated skill gets rewritten", async () => {
    installedDirs.set("alert-investigation", STALE_FILES);

    const { context, stdout } = createMockContext();
    await updateSkills(context, {}, ["alert-investigation"], deps);

    expect(installSkillFn).toHaveBeenCalledTimes(1);
    const call = installSkillFn.mock.calls[0]![0] as {
      name: string;
      files: Map<string, Uint8Array>;
    };
    expect(call.name).toBe("alert-investigation");
    expect(call.files).toBe(CURRENT_FILES);
    expect(stdout.join("")).toContain("Updated 1 skill: alert-investigation.");
  });

  test("any not-installed name exits 1 without touching anything", async () => {
    installedDirs = new Map([["alert-investigation", STALE_FILES]]);

    const { context, stderr, getExitCode } = createMockContext();
    await updateSkills(
      context,
      {},
      ["alert-investigation", "generate-opal"],
      deps,
    );

    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("generate-opal");
    expect(installSkillFn).not.toHaveBeenCalled();
  });
});

describe("skill update — bundled no-name", () => {
  test("all up to date reports summary message", async () => {
    const { context, stdout } = createMockContext();
    await updateSkills(context, {}, [], deps);

    expect(installSkillFn).not.toHaveBeenCalled();
    expect(stdout.join("")).toContain("All skills are up to date.");
  });

  test("outdated skill gets rewritten and reported", async () => {
    installedDirs.set("alert-investigation", STALE_FILES);

    const { context, stdout } = createMockContext();
    await updateSkills(context, {}, [], deps);

    expect(installSkillFn).toHaveBeenCalledTimes(1);
    expect(stdout.join("")).toContain("Updated 1 skill: alert-investigation.");
  });

  test("non-bundled installed skill is skipped", async () => {
    installedDirs = new Map([["not-bundled-skill", STALE_FILES]]);

    const { context, stdout } = createMockContext();
    await updateSkills(context, {}, [], deps);

    expect(installSkillFn).not.toHaveBeenCalled();
    expect(stdout.join("")).toContain("All skills are up to date.");
  });

  test("multiple outdated skills all get updated", async () => {
    installedDirs = new Map([
      ["alert-investigation", STALE_FILES],
      ["generate-opal", STALE_FILES],
    ]);

    const { context, stdout } = createMockContext();
    await updateSkills(context, {}, [], deps);

    expect(installSkillFn).toHaveBeenCalledTimes(2);
    const out = stdout.join("");
    expect(out).toContain("Updated 2 skills:");
    expect(out).toContain("alert-investigation");
    expect(out).toContain("generate-opal");
  });
});

describe("skill update — user-defined", () => {
  test("outdated user-defined skill gets rewritten", async () => {
    // expand:true returns full content directly from listSkills.
    // Disk has stale content; API returns updated content.
    installedDirs = new Map([["alert-investigation", STALE_FILES]]);
    listToReturn = [skillStub({ content: "new body" })];

    const { context, stdout } = createMockContext();
    await updateSkills(context, { userDefined: true }, [], deps);

    expect(installSkillFn).toHaveBeenCalledTimes(1);
    expect(stdout.join("")).toContain("Updated 1 skill: alert-investigation.");
  });
});
