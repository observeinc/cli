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
import { TagKind, type TagValuePair } from "../../rest/types/tag-values";
import { TagValuesSearchMode } from "../../rest/generated";

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

let lastRestArgs:
  | { query?: string; mode?: TagValuesSearchMode; limit?: number }
  | undefined;
let tagValuesToReturn: TagValuePair[];

const listTagValuesFn = mock(
  (args: { query?: string; mode?: TagValuesSearchMode; limit?: number }) => {
    lastRestArgs = args;
    return Promise.resolve({
      tagValuePairs: tagValuesToReturn,
      meta: { totalCount: tagValuesToReturn.length },
    });
  },
);

let list: (typeof import("./list"))["list"];

// Backends are injected via `deps` instead of `mock.module`, which is
// process-global in bun and leaks across test files.
const deps = {
  loadConfig: loadConfigFn,
  listTagValues: listTagValuesFn,
} as Parameters<(typeof import("./list"))["list"]>[1];

suppressAnsiColor();

beforeAll(async () => {
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
    lastRestArgs = undefined;
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

  test("defaults to semantic mode when --match is provided without --mode", async () => {
    const { context } = createMockContext();
    await list.call(
      context,
      { limit: 25, match: "checkout", json: true },
      deps,
    );
    expect(listTagValuesFn).toHaveBeenCalledTimes(1);
    expect(lastRestArgs).toMatchObject({
      query: "checkout",
      mode: TagValuesSearchMode.Semantic,
    });
  });

  test("maps --match/--mode/--limit onto the REST listTagValues query", async () => {
    const { context } = createMockContext();
    await list.call(
      context,
      { limit: 7, match: "svc", mode: "regex", json: true },
      deps,
    );
    expect(listTagValuesFn).toHaveBeenCalledTimes(1);
    expect(lastRestArgs).toMatchObject({
      query: "svc",
      mode: TagValuesSearchMode.Regex,
      limit: 7,
    });
  });

  test("falls back to a match-all regex when --match is empty", async () => {
    const { context } = createMockContext();
    await list.call(context, { limit: 7, json: true }, deps);
    expect(listTagValuesFn).toHaveBeenCalledTimes(1);
    expect(lastRestArgs).toMatchObject({
      query: ".*",
      mode: TagValuesSearchMode.Regex,
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
    await list.call(context, { limit: 25 }, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });
});
