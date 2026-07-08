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

const repoRoot = resolve(import.meta.dir, "../../..");
const gqlModulePath = resolve(
  repoRoot,
  "src/gql/datastream/list-datastreams.ts",
);

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

const listDatastreamsFn = mock((_config: unknown, _variables: unknown) =>
  Promise.resolve([
    {
      id: "ds-1",
      name: "Stream A",
      description: "",
      disabled: false,
      directWrite: null,
    },
    {
      id: "ds-2",
      name: "Stream B",
      description: "",
      disabled: false,
      directWrite: { otelLogs: { datasetId: "d-1" } },
    },
  ]),
);

let list: (typeof import("./list"))["list"];

const deps = {
  loadConfig: loadConfigFn,
} as Parameters<(typeof import("./list"))["list"]>[1];

suppressAnsiColor();

beforeAll(async () => {
  void mock.module(gqlModulePath, () => ({
    listDatastreams: listDatastreamsFn,
  }));

  const mod = await import("./list.ts");
  list = mod.list;
});

afterAll(() => {
  mock.restore();
});

describe("datastream list", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    listDatastreamsFn.mockClear();
  });

  test("calls listDatastreams and outputs array", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, {}, deps);

    expect(listDatastreamsFn).toHaveBeenCalledTimes(1);
    const output = JSON.parse(stdout.join(""));
    expect(output).toHaveLength(2);
    expect(output[0].name).toBe("Stream A");
  });

  test("filters by name substring (case-insensitive) client-side", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { match: "stream a" }, deps);

    const [, variables] = listDatastreamsFn.mock.calls[0]!;
    expect(variables).toBeUndefined();
    const output = JSON.parse(stdout.join(""));
    expect(output).toHaveLength(1);
    expect(output[0].name).toBe("Stream A");
  });

  test("returns empty array when name matches nothing", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { match: "nonexistent" }, deps);

    const output = JSON.parse(stdout.join(""));
    expect(output).toEqual([]);
  });

  test("exits with code 1 on API error", async () => {
    listDatastreamsFn.mockImplementationOnce(() => {
      const err = new Error("Server error");
      err.name = "GqlApiError";
      (err as unknown as { statusCode: number }).statusCode = 500;
      throw err;
    });

    const { context, stderr, getExitCode } = createMockContext();
    try {
      await list.call(context, {}, deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });
});
