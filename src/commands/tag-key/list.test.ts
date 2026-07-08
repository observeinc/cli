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
import type { TagKeyEntry } from "../../rest/types/tag-keys";

const repoRoot = resolve(import.meta.dir, "../../..");
const listTagKeysModulePath = resolve(
  repoRoot,
  "src/rest/tag-key/list-tag-keys.ts",
);

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

let lastListArgs:
  | { match?: string; mode?: string; limit?: number; valueLimit?: number }
  | undefined;
let tagKeysToReturn: TagKeyEntry[];

const listTagKeysFn = mock(
  (args: {
    match?: string;
    mode?: string;
    limit?: number;
    valueLimit?: number;
  }) => {
    lastListArgs = args;
    return Promise.resolve({ tagKeys: tagKeysToReturn });
  },
);

let list: (typeof import("./list"))["list"];

const deps = {
  loadConfig: loadConfigFn,
} as Parameters<(typeof import("./list"))["list"]>[1];

suppressAnsiColor();

beforeAll(async () => {
  void mock.module(listTagKeysModulePath, () => ({
    listTagKeys: listTagKeysFn,
  }));

  const mod = await import("./list.ts");
  list = mod.list;
});

afterAll(() => {
  mock.restore();
});

describe("tag-key list", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    listTagKeysFn.mockClear();
    lastListArgs = undefined;
    tagKeysToReturn = [
      { name: "service.name", values: ["checkout", "cart"] },
      { name: "k8s.namespace", values: ["prod"] },
    ];
  });

  test("emits tag keys as JSON with --json", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 10, json: true }, deps);
    const payload = JSON.parse(stdout.join("")) as TagKeyEntry[];
    expect(payload).toHaveLength(2);
    expect(payload[0]!.name).toBe("service.name");
  });

  test("renders a table with a count header by default", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 10 }, deps);
    const out = stdout.join("");
    expect(out).toContain("Found 2 tag key(s)");
    expect(out).toContain("service.name");
    expect(out).toContain("checkout, cart");
  });

  test("forwards --match/--mode/--limit/--value-limit to the API", async () => {
    const { context } = createMockContext();
    await list.call(
      context,
      {
        limit: 5,
        match: "svc",
        mode: "regex",
        "value-limit": 3,
        json: true,
      },
      deps,
    );
    expect(lastListArgs).toMatchObject({
      match: "svc",
      mode: "regex",
      limit: 5,
      valueLimit: 3,
    });
  });

  test("warns when there are no tag keys", async () => {
    tagKeysToReturn = [];
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 10 }, deps);
    expect(stdout.join("")).toContain("No tag keys found.");
  });

  test("exits with code 1 on API error", async () => {
    listTagKeysFn.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await list.call(context, { limit: 10 }, deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });
});
