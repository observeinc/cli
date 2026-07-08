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
import { SkillVisibility, type SkillResource } from "../../rest/generated";

const repoRoot = resolve(import.meta.dir, "../../..");
const getSkillModulePath = resolve(repoRoot, "src/rest/skill/get-skill.ts");

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

function skillStub(): SkillResource {
  return {
    id: "skill-1",
    label: "Investigate Alerts",
    description: "SRE workflow",
    visibility: SkillVisibility.Listed,
    createdBy: { id: "u-1", label: "Alice" },
    createdAt: "2026-07-01T00:00:00Z",
    updatedBy: { id: "u-1", label: "Alice" },
    updatedAt: "2026-07-01T00:00:00Z",
    content: "# Skill body\nSteps here.",
  };
}

let skillToReturn: SkillResource | null;
const getSkillFn = mock((_args: { config: unknown; skillId: string }) =>
  Promise.resolve(skillToReturn),
);

let view: (typeof import("./view"))["view"];

const deps = {
  loadConfig: loadConfigFn,
} as Parameters<(typeof import("./view"))["view"]>[2];

suppressAnsiColor();

beforeAll(async () => {
  void mock.module(getSkillModulePath, () => ({
    getSkill: getSkillFn,
  }));

  const mod = await import("./view.ts");
  view = mod.view;
});

afterAll(() => {
  mock.restore();
});

describe("skill view", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    getSkillFn.mockClear();
    skillToReturn = skillStub();
  });

  test("passes the skill id and emits JSON with --json", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, { json: true }, "skill-1", deps);

    expect(getSkillFn).toHaveBeenCalledTimes(1);
    const [firstArgs] = getSkillFn.mock.calls[0]!;
    expect(firstArgs).toMatchObject({ skillId: "skill-1" });
    const payload = JSON.parse(stdout.join("")) as SkillResource;
    expect(payload.id).toBe("skill-1");
  });

  test("prints only the raw content with --content", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, { content: true }, "skill-1", deps);
    // --content mutes status chatter and prints nothing but the body.
    expect(stdout.join("")).toBe("# Skill body\nSteps here.\n");
  });

  test("renders label, metadata, and content by default", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, {}, "skill-1", deps);
    const out = stdout.join("");
    expect(out).toContain("Skill Investigate Alerts");
    expect(out).toContain("Content");
    expect(out).toContain("Steps here.");
  });

  test("errors and exits 1 when the skill is not found", async () => {
    skillToReturn = null;
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await view.call(context, {}, "missing", deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Skill not found: missing");
  });

  test("exits with code 1 on API error", async () => {
    getSkillFn.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await view.call(context, {}, "skill-1", deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });
});
