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
import type { ParsedSkill } from "../../lib/skills/parse";

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

function bundledStub(): ParsedSkill {
  return {
    name: "generate-opal",
    description: "Core OPAL guidance",
    userInvocable: false,
    body: "# Core OPAL\nSteps here.",
    raw: "---\nname: generate-opal\n---\n# Core OPAL\nSteps here.",
  };
}

let skillToReturn: SkillResource | null;
const getSkillFn = mock((_args: { config: unknown; skillId: string }) =>
  Promise.resolve(skillToReturn),
);

let bundledToReturn: ParsedSkill | null;
const fetchBundledSkillFn = mock((_name: string) =>
  Promise.resolve(bundledToReturn),
);

let view: (typeof import("./view"))["view"];

const deps = {
  loadConfig: loadConfigFn,
  fetchBundledSkill: fetchBundledSkillFn,
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

describe("skill view — user-defined (--user-defined)", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    getSkillFn.mockClear();
    skillToReturn = skillStub();
  });

  test("passes the skill id and emits JSON with --json", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, { json: true, userDefined: true }, "7291", deps);

    expect(getSkillFn).toHaveBeenCalledTimes(1);
    const [firstArgs] = getSkillFn.mock.calls[0]!;
    expect(firstArgs).toMatchObject({ skillId: "7291" });
    const payload = JSON.parse(stdout.join("")) as SkillResource;
    expect(payload.id).toBe("skill-1");
  });

  test("prints only the raw content with --content", async () => {
    const { context, stdout } = createMockContext();
    await view.call(
      context,
      { content: true, userDefined: true },
      "7291",
      deps,
    );
    // --content mutes status chatter and prints nothing but the body.
    expect(stdout.join("")).toBe("# Skill body\nSteps here.\n");
  });

  test("renders label, metadata, and content by default", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, { userDefined: true }, "7291", deps);
    const out = stdout.join("");
    expect(out).toContain("Skill Investigate Alerts");
    expect(out).toContain("Content");
    expect(out).toContain("Steps here.");
  });

  test("errors and exits 1 when the skill is not found", async () => {
    skillToReturn = null;
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await view.call(context, { userDefined: true }, "7291", deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Skill not found: 7291");
  });

  test("exits with code 1 on API error", async () => {
    getSkillFn.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await view.call(context, { userDefined: true }, "7291", deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });
});

describe("skill view — bundled (name)", () => {
  beforeEach(() => {
    getSkillFn.mockClear();
    fetchBundledSkillFn.mockClear();
    bundledToReturn = bundledStub();
  });

  test("fetches the bundled skill by name, not the REST path", async () => {
    const { context } = createMockContext();
    await view.call(context, {}, "generate-opal", deps);
    expect(fetchBundledSkillFn).toHaveBeenCalledTimes(1);
    expect(fetchBundledSkillFn.mock.calls[0]![0]).toBe("generate-opal");
    expect(getSkillFn).not.toHaveBeenCalled();
  });

  test("emits JSON with the name and the skill body as content", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, { json: true }, "generate-opal", deps);
    const payload = JSON.parse(stdout.join("")) as {
      name: string;
      content: string;
    };
    expect(payload.name).toBe("generate-opal");
    expect(payload.content).toBe(bundledStub().body);
  });

  test("prints the skill body with --content", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, { content: true }, "generate-opal", deps);
    expect(stdout.join("")).toBe(bundledStub().body + "\n");
  });

  test("renders the name, details, and body by default", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, {}, "generate-opal", deps);
    const out = stdout.join("");
    expect(out).toContain("Skill generate-opal");
    expect(out).toContain("Content");
    expect(out).toContain("# Core OPAL");
  });
});
