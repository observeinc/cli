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
import type { TagKeyEntry } from "../../rest/types/tag-keys";

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

let lastRestArgs:
  | { filter?: string; limit?: number; offset?: number; valueLimit?: number }
  | undefined;
let tagKeysToReturn: TagKeyEntry[];

const listTagKeysFn = mock(
  (args: {
    filter?: string;
    limit?: number;
    offset?: number;
    valueLimit?: number;
  }) => {
    lastRestArgs = args;
    return Promise.resolve({
      tagKeys: tagKeysToReturn,
      meta: { totalCount: tagKeysToReturn.length },
    });
  },
);

let list: (typeof import("./list"))["list"];

// Backends are injected via `deps` instead of `mock.module`, which is
// process-global in bun and leaks across test files.
const deps = {
  loadConfig: loadConfigFn,
  listTagKeys: listTagKeysFn,
} as Parameters<(typeof import("./list"))["list"]>[1];

suppressAnsiColor();

beforeAll(async () => {
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
    lastRestArgs = undefined;
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

  test("builds a correlation-scoped name filter for the REST listTagKeys", async () => {
    const { context } = createMockContext();
    await list.call(
      context,
      { limit: 5, match: "svc", "value-limit": 3, json: true },
      deps,
    );
    expect(listTagKeysFn).toHaveBeenCalledTimes(1);
    expect(lastRestArgs).toMatchObject({ limit: 5, valueLimit: 3 });
    expect(lastRestArgs?.filter).toContain('kind == "Correlation"');
    expect(lastRestArgs?.filter).toContain(
      'name.lowerAscii().contains("svc".lowerAscii())',
    );
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
    await list.call(context, { limit: 10 }, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });
});
