import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../test-helpers";
import { resolve } from "node:path";
import {
  ListSkillsVisibilityParameter,
  SkillVisibility,
  type SkillResource,
} from "../../rest/generated";

const repoRoot = resolve(import.meta.dir, "../../..");
const listSkillsModulePath = resolve(repoRoot, "src/rest/skill/list-skills.ts");

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

function skillStub(id: string, label: string, description = ""): SkillResource {
  return {
    id,
    label,
    description,
    visibility: SkillVisibility.Listed,
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

let list: (typeof import("./list"))["list"];

const deps = {
  loadConfig: loadConfigFn,
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

describe("skill list", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    listSkillsFn.mockClear();
    lastListArgs = undefined;
    skillsToReturn = [
      skillStub("skill-1", "Investigate Alerts", "SRE workflow"),
      skillStub("skill-2", "Trace Analysis", "latency deep dive"),
    ];
  });

  test("emits raw skills as JSON with --json", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 100, json: true }, deps);

    const payload = JSON.parse(stdout.join("")) as SkillResource[];
    expect(payload).toHaveLength(2);
    expect(payload[0]!.id).toBe("skill-1");
  });

  test("renders a table with a count header by default", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 100 }, deps);
    const out = stdout.join("");
    expect(out).toContain("Found 2 skill(s)");
    expect(out).toContain("Investigate Alerts");
  });

  test("filters client-side on --match against label and description", async () => {
    const { context, stdout } = createMockContext();
    await list.call(
      context,
      { limit: 100, match: "latency", json: true },
      deps,
    );
    const payload = JSON.parse(stdout.join("")) as SkillResource[];
    expect(payload).toHaveLength(1);
    expect(payload[0]!.id).toBe("skill-2");
  });

  test("maps --visibility to the API visibility parameter", async () => {
    const { context } = createMockContext();

    await list.call(
      context,
      { limit: 100, visibility: "unlisted", json: true },
      deps,
    );
    expect(lastListArgs?.visibility).toBe(
      ListSkillsVisibilityParameter.Unlisted,
    );

    await list.call(
      context,
      { limit: 100, visibility: "listed", json: true },
      deps,
    );
    expect(lastListArgs?.visibility).toBe(ListSkillsVisibilityParameter.Listed);
  });

  test("warns when there are no skills", async () => {
    skillsToReturn = [];
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 100 }, deps);
    expect(stdout.join("")).toContain("No skills found.");
  });

  test("exits with code 1 on API error", async () => {
    listSkillsFn.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    const { context, stderr, getExitCode } = createMockContext();
    await list.call(context, { limit: 100 }, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });
});
