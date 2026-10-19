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
import type { Config } from "../../lib/config";
import { dashboardStub, listEnvelope, loadConfigStub } from "./test-fixtures";
import type { ListDashboardsDeps } from "./list";

const loadConfigFn = loadConfigStub();

interface ListArgs {
  config: Config;
  filter?: string;
  orderBy?: string;
  limit?: number;
  offset?: number;
}

let lastListArgs: ListArgs | undefined;

const listDashboardsFn = mock((args: ListArgs) => {
  lastListArgs = args;
  return Promise.resolve(listEnvelope([dashboardStub()]));
});

let list: (typeof import("./list"))["list"];

// Backends are injected via `deps` instead of `mock.module`, which is
// process-global in bun and leaks across test files.
const deps: ListDashboardsDeps = {
  loadConfig: loadConfigFn,
  listDashboards: listDashboardsFn,
};

suppressAnsiColor();

beforeAll(async () => {
  const mod = await import("./list.ts");
  list = mod.list;
});

afterAll(() => {
  mock.restore();
});

beforeEach(() => {
  listDashboardsFn.mockClear();
  lastListArgs = undefined;
});

describe("dashboard list — filters", () => {
  test("omits filter entirely when no filter flags are set", async () => {
    const { context } = createMockContext();
    await list.call(context, { limit: 100 }, deps);
    expect(lastListArgs?.filter).toBeUndefined();
  });

  test("--match builds a case-insensitive regex on name", async () => {
    const { context } = createMockContext();
    await list.call(context, { limit: 100, match: "prod" }, deps);
    expect(lastListArgs?.filter).toBe('name.matches("(?i)prod")');
  });

  test("--match escapes regex metacharacters", async () => {
    const { context } = createMockContext();
    await list.call(context, { limit: 100, match: "a.b*c" }, deps);
    expect(lastListArgs?.filter).toBe('name.matches("(?i)a\\\\.b\\\\*c")');
  });

  test("--match escapes quotes so the CEL literal stays intact", async () => {
    const { context } = createMockContext();
    await list.call(context, { limit: 100, match: 'a"b' }, deps);
    expect(lastListArgs?.filter).toBe('name.matches("(?i)a\\"b")');
  });

  test("--visibility becomes an equality clause", async () => {
    const { context } = createMockContext();
    await list.call(context, { limit: 100, visibility: "Hidden" }, deps);
    expect(lastListArgs?.filter).toBe('visibility == "Hidden"');
  });

  test("--filter passes a raw CEL expression through", async () => {
    const { context } = createMockContext();
    await list.call(context, { limit: 100, filter: "createdBy.id == 7" }, deps);
    expect(lastListArgs?.filter).toBe("createdBy.id == 7");
  });

  test("combines match, visibility, and filter with AND", async () => {
    const { context } = createMockContext();
    await list.call(
      context,
      {
        limit: 100,
        match: "prod",
        visibility: "Listed",
        filter: "createdBy.id == 7",
      },
      deps,
    );
    expect(lastListArgs?.filter).toBe(
      '(name.matches("(?i)prod")) && (visibility == "Listed") && (createdBy.id == 7)',
    );
  });
});

describe("dashboard list — pagination and sorting", () => {
  test("forwards limit, offset, and sort to the API", async () => {
    const { context } = createMockContext();
    await list.call(
      context,
      { limit: 25, offset: 50, sort: "updatedAt" },
      deps,
    );
    expect(lastListArgs).toMatchObject({
      limit: 25,
      offset: 50,
      orderBy: "updatedAt",
    });
  });

  test("hints at the next page when the page is full", async () => {
    listDashboardsFn.mockImplementationOnce((args: ListArgs) => {
      lastListArgs = args;
      return Promise.resolve(
        listEnvelope([dashboardStub({ id: "1" }), dashboardStub({ id: "2" })], {
          totalCount: 10,
        }),
      );
    });
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 2 }, deps);
    expect(stdout.join("")).toContain("--offset 2");
  });

  test("does not hint at a next page on a partial page", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 100 }, deps);
    expect(stdout.join("")).not.toContain("--offset");
  });

  test("counts omitted items toward a full page when hinting", async () => {
    // One readable row plus one omitted row fills a limit of 2, so there may
    // still be a next page even though only one row was rendered.
    listDashboardsFn.mockImplementationOnce((args: ListArgs) => {
      lastListArgs = args;
      return Promise.resolve(
        listEnvelope([dashboardStub()], {
          totalCount: 10,
          errors: [{ id: "999", type: "PermissionDenied", message: "no" }],
        }),
      );
    });
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 2 }, deps);
    expect(stdout.join("")).toContain("--offset 2");
  });
});

describe("dashboard list — output", () => {
  test("table output includes the total count from meta", async () => {
    listDashboardsFn.mockImplementationOnce((args: ListArgs) => {
      lastListArgs = args;
      return Promise.resolve(
        listEnvelope([dashboardStub()], { totalCount: 334 }),
      );
    });
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 100 }, deps);
    expect(stdout.join("")).toContain("(334 total)");
  });

  test("omits the total when the API reports an unknown count", async () => {
    listDashboardsFn.mockImplementationOnce((args: ListArgs) => {
      lastListArgs = args;
      return Promise.resolve(
        listEnvelope([dashboardStub()], { totalCount: -1 }),
      );
    });
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 100 }, deps);
    expect(stdout.join("")).toContain("Found 1 dashboard(s):");
    expect(stdout.join("")).not.toContain("total)");
  });

  test("--json emits the dashboards array only", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 100, json: true }, deps);
    const parsed: unknown = JSON.parse(stdout.join(""));
    expect(Array.isArray(parsed)).toBe(true);
    expect((parsed as { id: string }[])[0]!.id).toBe("41217002");
  });

  test("--json suppresses status chatter", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 100, json: true }, deps);
    expect(stdout.join("")).not.toContain("Fetching dashboards");
  });

  test("--fields selects which columns are rendered", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 100, fields: ["id", "name"] }, deps);
    const out = stdout.join("");
    expect(out).toContain("NAME");
    expect(out).not.toContain("VISIBILITY");
  });

  test("warns when no dashboards match", async () => {
    listDashboardsFn.mockImplementationOnce((args: ListArgs) => {
      lastListArgs = args;
      return Promise.resolve(listEnvelope([]));
    });
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 100 }, deps);
    expect(stdout.join("")).toContain("No dashboards found.");
  });
});

describe("dashboard list — partial failures", () => {
  test("reports per-item errors from the envelope on stderr", async () => {
    listDashboardsFn.mockImplementationOnce((args: ListArgs) => {
      lastListArgs = args;
      return Promise.resolve(
        listEnvelope([dashboardStub()], {
          errors: [
            { id: "999", type: "PermissionDenied", message: "no access" },
          ],
        }),
      );
    });
    const { context, stderr } = createMockContext();
    await list.call(context, { limit: 100 }, deps);
    const out = stderr.join("");
    expect(out).toContain("999");
    expect(out).toContain("PermissionDenied");
    expect(out).toContain("no access");
  });

  test("still reports per-item errors in --json mode", async () => {
    listDashboardsFn.mockImplementationOnce((args: ListArgs) => {
      lastListArgs = args;
      return Promise.resolve(
        listEnvelope([dashboardStub()], {
          errors: [{ id: "999", type: "Internal", message: "boom" }],
        }),
      );
    });
    const { context, stderr } = createMockContext();
    await list.call(context, { limit: 100, json: true }, deps);
    expect(stderr.join("")).toContain("999");
  });
});

describe("dashboard list — error handling", () => {
  test("loadConfig failure exits 1", async () => {
    loadConfigFn.mockImplementationOnce((): never => {
      throw new Error("no config file found");
    });
    const { context, stderr, getExitCode } = createMockContext();
    await list.call(context, { limit: 100 }, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });

  test("API rejection exits 1", async () => {
    listDashboardsFn.mockImplementationOnce(() =>
      Promise.reject(new Error("upstream unavailable")),
    );
    const { context, stderr, getExitCode } = createMockContext();
    await list.call(context, { limit: 100 }, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("upstream unavailable");
  });
});
