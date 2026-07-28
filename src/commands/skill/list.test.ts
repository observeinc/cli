import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  synthesizeUserSkill,
  slugifyLabel,
} from "../../lib/skills/install-target";
import { createMockContext, suppressAnsiColor } from "../../test-helpers";
import { resolve } from "node:path";
import {
  ListSkillsVisibilityParameter,
  SkillVisibility,
  type SkillResource,
} from "../../rest/generated";
import type { BundledRepo } from "../../lib/skills/bundled-repo";

const repoRoot = resolve(import.meta.dir, "../../..");
const listSkillsModulePath = resolve(repoRoot, "src/rest/skill/list-skills.ts");

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

function skillStub(
  id: string,
  label: string,
  description = "",
  visibility: SkillVisibility = SkillVisibility.Listed,
): SkillResource {
  return {
    id,
    label,
    description,
    visibility,
    createdBy: { id: "u-1", label: "Alice" },
    createdAt: "2026-07-01T00:00:00Z",
    updatedBy: { id: "u-1", label: "Alice" },
    updatedAt: "2026-07-01T00:00:00Z",
    content: "# body",
  };
}

let lastListArgs: { visibility?: unknown; limit?: number } | undefined;
let skillsToReturn: SkillResource[];

const listSkillsFn = mock((args: { visibility?: unknown; limit?: number }) => {
  lastListArgs = args;
  return Promise.resolve({ skills: skillsToReturn });
});

// The bundled catalog is exercised via the injected getBundledRepo /
// listBundledCatalog deps, so tests never touch the network or filesystem.
const fakeRepo: BundledRepo = { skillsDir: "/tmp/fake/skills", etag: '"v1"' };
let bundledToReturn: { name: string; description: string }[];

const getBundledRepoFn = mock(() => Promise.resolve(fakeRepo));
let lastCatalogRepo: BundledRepo | undefined;
const listBundledCatalogFn = mock((repo: BundledRepo) => {
  lastCatalogRepo = repo;
  return bundledToReturn;
});

// Default: returns empty map so size === 0 → "outdated" for any existing dir.
const readInstalledSkillFilesFn = mock(
  (_dir: string): Map<string, Uint8Array> => new Map<string, Uint8Array>(),
);

// Default: returns empty files so hash comparison falls to "outdated".
const readBundledSkillFilesFn = mock(
  (_repo: BundledRepo, _name: string): Map<string, Uint8Array> =>
    new Map<string, Uint8Array>(),
);

let list: (typeof import("./list"))["list"];

// home points at a path that does not exist on disk → existsSync always false.
const FAKE_HOME = "/fake/home";

const deps = {
  loadConfig: loadConfigFn,
  getBundledRepo: getBundledRepoFn,
  listBundledCatalog: listBundledCatalogFn,
  readBundledSkillFiles: readBundledSkillFilesFn,
  readInstalledSkillFiles: readInstalledSkillFilesFn,
  home: FAKE_HOME,
} as Parameters<(typeof import("./list"))["list"]>[1];

suppressAnsiColor();

beforeAll(async () => {
  void mock.module(listSkillsModulePath, () => ({
    listSkills: listSkillsFn,
  }));

  const mod = await import("./list.ts");
  list = mod.list;
});

afterAll(() => {
  mock.restore();
});

describe("skill list — bundled (default)", () => {
  beforeEach(() => {
    getBundledRepoFn.mockClear();
    listBundledCatalogFn.mockClear();
    listSkillsFn.mockClear();
    readInstalledSkillFilesFn.mockClear();
    readBundledSkillFilesFn.mockClear();
    lastCatalogRepo = undefined;
    bundledToReturn = [
      { name: "alert-investigation", description: "Investigate an alert" },
      { name: "generate-opal", description: "Core OPAL guidance" },
    ];
  });

  test("lists the bundled catalog, not the user-defined path", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, {}, deps);

    expect(getBundledRepoFn).toHaveBeenCalledTimes(1);
    expect(listBundledCatalogFn).toHaveBeenCalledTimes(1);
    expect(lastCatalogRepo).toBe(fakeRepo);
    expect(listSkillsFn).not.toHaveBeenCalled();

    const out = stdout.join("");
    expect(out).toContain("NAME");
    expect(out).toContain("DESCRIPTION");
    expect(out).toContain("alert-investigation");
    expect(out).toContain("generate-opal");
  });

  test("emits { name, description }[] as JSON with --json", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { json: true }, deps);

    const payload = JSON.parse(stdout.join("")) as {
      name: string;
      installed: string;
      description: string;
    }[];
    expect(
      payload.map(({ name, description }) => ({ name, description })),
    ).toEqual(bundledToReturn);
  });

  test("filters client-side on --match against name and description", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { match: "OPAL", json: true }, deps);
    const payload = JSON.parse(stdout.join("")) as { name: string }[];
    expect(payload).toHaveLength(1);
    expect(payload[0]!.name).toBe("generate-opal");
  });

  test("warns when the catalog is empty", async () => {
    bundledToReturn = [];
    const { context, stdout } = createMockContext();
    await list.call(context, {}, deps);
    expect(stdout.join("")).toContain("No skills found.");
  });

  test("sets exit code 1 when the bundled fetch fails", async () => {
    getBundledRepoFn.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    const { context, stderr, getExitCode } = createMockContext();
    await list.call(context, {}, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });

  test("rejects a user-defined-only flag without --user-defined, before fetching", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    await list.call(context, { visibility: "listed" }, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain(
      "--visibility is only valid with --user-defined",
    );
    expect(getBundledRepoFn).not.toHaveBeenCalled();
    expect(listSkillsFn).not.toHaveBeenCalled();
  });
});

describe("skill list — user-defined (--user-defined)", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    listSkillsFn.mockClear();
    getBundledRepoFn.mockClear();
    readInstalledSkillFilesFn.mockClear();
    lastListArgs = undefined;
    skillsToReturn = [
      skillStub(
        "7291",
        "team-triage",
        "Our internal triage runbook",
        SkillVisibility.Listed,
      ),
      skillStub(
        "7302",
        "my-notes",
        "Personal scratch notes",
        SkillVisibility.Unlisted,
      ),
    ];
  });

  test("renders the platform skills with mapped visibility, not the bundled catalog", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { userDefined: true }, deps);

    expect(listSkillsFn).toHaveBeenCalledTimes(1);
    expect(getBundledRepoFn).not.toHaveBeenCalled();

    const out = stdout.join("");
    expect(out).toContain("ID");
    expect(out).toContain("LABEL");
    expect(out).toContain("VISIBILITY");
    expect(out).toContain("DESCRIPTION");
    expect(out).toContain("team-triage");
    // Listed → workspace, Unlisted → private, and the raw enum is not shown.
    expect(out).toContain("workspace");
    expect(out).toContain("private");
    expect(out).not.toContain("Listed");
    expect(out).not.toContain("Unlisted");
  });

  test("emits raw SkillResource[] as JSON, keeping the enum visibility", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { userDefined: true, json: true }, deps);
    const payload = JSON.parse(stdout.join("")) as SkillResource[];
    expect(payload).toHaveLength(2);
    expect(payload[0]!.id).toBe("7291");
    expect(payload[0]!.visibility).toBe(SkillVisibility.Listed);
    expect(payload[1]!.visibility).toBe(SkillVisibility.Unlisted);
  });

  test("filters client-side on --match against label and description", async () => {
    const { context, stdout } = createMockContext();
    await list.call(
      context,
      { userDefined: true, match: "scratch", json: true },
      deps,
    );
    const payload = JSON.parse(stdout.join("")) as SkillResource[];
    expect(payload).toHaveLength(1);
    expect(payload[0]!.id).toBe("7302");
  });

  test("maps --visibility to the API visibility parameter", async () => {
    const { context } = createMockContext();

    await list.call(
      context,
      { userDefined: true, visibility: "unlisted", json: true },
      deps,
    );
    expect(lastListArgs?.visibility).toBe(
      ListSkillsVisibilityParameter.Unlisted,
    );

    await list.call(
      context,
      { userDefined: true, visibility: "listed", json: true },
      deps,
    );
    expect(lastListArgs?.visibility).toBe(ListSkillsVisibilityParameter.Listed);
  });
});

describe("skill list — bundled INSTALLED column", () => {
  let tmpHome: string;

  beforeEach(() => {
    tmpHome = mkdtempSync(join(tmpdir(), "list-bundled-installed-"));
    getBundledRepoFn.mockClear();
    listBundledCatalogFn.mockClear();
    readInstalledSkillFilesFn.mockClear();
    readBundledSkillFilesFn.mockClear();
    bundledToReturn = [
      { name: "alert-investigation", description: "Investigate an alert" },
    ];
  });

  afterEach(() => {
    rmSync(tmpHome, { recursive: true, force: true });
  });

  test("shows 'no' when the canonical dir does not exist", async () => {
    // tmpHome is a fresh empty dir — no .agents/skills/alert-investigation subdir.
    const { context, stdout } = createMockContext();
    await list.call(context, { json: true }, { ...deps, home: tmpHome });
    const payload = JSON.parse(stdout.join("")) as { installed: string }[];
    expect(payload[0]!.installed).toBe("no");
  });

  test("shows 'outdated' when canonical dir exists but contains no files", async () => {
    mkdirSync(join(tmpHome, ".agents", "skills", "alert-investigation"), {
      recursive: true,
    });
    // readInstalledSkillFiles default returns empty Map → size === 0 → "outdated"
    const { context, stdout } = createMockContext();
    await list.call(context, { json: true }, { ...deps, home: tmpHome });
    const payload = JSON.parse(stdout.join("")) as { installed: string }[];
    expect(payload[0]!.installed).toBe("outdated");
  });

  test("shows 'outdated' when installed files do not match current bundled files", async () => {
    mkdirSync(join(tmpHome, ".agents", "skills", "alert-investigation"), {
      recursive: true,
    });
    readInstalledSkillFilesFn.mockImplementationOnce(
      () => new Map([["SKILL.md", new Uint8Array([1, 2, 3])]]),
    );
    readBundledSkillFilesFn.mockImplementationOnce(
      () => new Map([["SKILL.md", new Uint8Array([4, 5, 6])]]),
    );
    const { context, stdout } = createMockContext();
    await list.call(context, { json: true }, { ...deps, home: tmpHome });
    const payload = JSON.parse(stdout.join("")) as { installed: string }[];
    expect(payload[0]!.installed).toBe("outdated");
  });

  test("shows 'yes' when installed files match current bundled files", async () => {
    mkdirSync(join(tmpHome, ".agents", "skills", "alert-investigation"), {
      recursive: true,
    });
    const files = new Map<string, Uint8Array>([
      ["SKILL.md", new Uint8Array([1, 2, 3])],
    ]);
    readInstalledSkillFilesFn.mockImplementationOnce(() => files);
    readBundledSkillFilesFn.mockImplementationOnce(() => files);
    const { context, stdout } = createMockContext();
    await list.call(context, { json: true }, { ...deps, home: tmpHome });
    const payload = JSON.parse(stdout.join("")) as { installed: string }[];
    expect(payload[0]!.installed).toBe("yes");
  });
});

describe("skill list — user-defined INSTALLED column", () => {
  let tmpHome: string;
  const SKILL_ID = "7291";
  const SKILL_LABEL = "team-triage";

  function buildStub(): SkillResource {
    return skillStub(
      SKILL_ID,
      SKILL_LABEL,
      "Our internal triage runbook",
      SkillVisibility.Listed,
    );
  }

  beforeEach(() => {
    tmpHome = mkdtempSync(join(tmpdir(), "list-ud-installed-"));
    loadConfigFn.mockClear();
    listSkillsFn.mockClear();
    getBundledRepoFn.mockClear();
    readInstalledSkillFilesFn.mockClear();
    skillsToReturn = [buildStub()];
  });

  afterEach(() => {
    rmSync(tmpHome, { recursive: true, force: true });
  });

  test("shows 'yes' when installed files match synthesized skill files", async () => {
    const stub = buildStub();
    const slug = slugifyLabel(SKILL_LABEL);
    mkdirSync(join(tmpHome, ".agents", "skills", slug), { recursive: true });
    const { files } = synthesizeUserSkill(stub);
    readInstalledSkillFilesFn.mockImplementationOnce(() => files);
    const { context, stdout } = createMockContext();
    await list.call(
      context,
      { userDefined: true, json: true },
      { ...deps, home: tmpHome },
    );
    const payload = JSON.parse(stdout.join("")) as { installed: string }[];
    expect(payload[0]!.installed).toBe("yes");
  });
});
