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
import { TagKind, type TagValuePair } from "../../rest/types/tag-values";

const repoRoot = resolve(import.meta.dir, "../../..");
const listTagValuesModulePath = resolve(
  repoRoot,
  "src/rest/tag-value/list-tag-values.ts",
);

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

let lastListArgs: { match?: string; mode?: string; limit?: number } | undefined;
let tagValuesToReturn: TagValuePair[];

const listTagValuesFn = mock(
  (args: { match?: string; mode?: string; limit?: number }) => {
    lastListArgs = args;
    return Promise.resolve({ tagValuePairs: tagValuesToReturn });
  },
);

let list: (typeof import("./list"))["list"];

const deps = {
  loadConfig: loadConfigFn,
} as Parameters<(typeof import("./list"))["list"]>[1];

suppressAnsiColor();

beforeAll(async () => {
  void mock.module(listTagValuesModulePath, () => ({
    listTagValues: listTagValuesFn,
  }));

  const mod = await import("./list.ts");
  list = mod.list;
});

afterAll(() => {
  mock.restore();
});

describe("tag-value list", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    listTagValuesFn.mockClear();
    lastListArgs = undefined;
    tagValuesToReturn = [
      { name: "service.name", value: "checkout", kind: TagKind.Correlation },
      { name: "service.name", value: "cart", kind: TagKind.Correlation },
    ];
  });

  test("emits tag value pairs as JSON with --json", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 25, json: true }, deps);
    const payload = JSON.parse(stdout.join("")) as TagValuePair[];
    expect(payload).toHaveLength(2);
    expect(payload[0]!.value).toBe("checkout");
  });

  test("renders a table with a count header by default", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 25 }, deps);
    const out = stdout.join("");
    expect(out).toContain("Found 2 tag value(s)");
    expect(out).toContain("checkout");
  });

  test("forwards --match/--mode/--limit to the API", async () => {
    const { context } = createMockContext();
    await list.call(
      context,
      { limit: 7, match: "svc", mode: "semantic", json: true },
      deps,
    );
    expect(lastListArgs).toMatchObject({
      match: "svc",
      mode: "semantic",
      limit: 7,
    });
  });

  test("warns when there are no tag values", async () => {
    tagValuesToReturn = [];
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 25 }, deps);
    expect(stdout.join("")).toContain("No tag values found.");
  });

  test("exits with code 1 on API error", async () => {
    listTagValuesFn.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await list.call(context, { limit: 25 }, deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });
});
