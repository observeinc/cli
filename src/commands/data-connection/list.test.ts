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
import { GqlApiError } from "../../gql/gql-request";

const repoRoot = resolve(import.meta.dir, "../../..");
const searchConnectionsModulePath = resolve(
  repoRoot,
  "src/gql/connection/search-connections.ts",
);

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

let lastSearchArgs: unknown;
const searchConnectionsFn = mock((_config: unknown, variables: unknown) => {
  lastSearchArgs = variables;
  return Promise.resolve([
    { id: "conn-1", name: "aws-prod", moduleID: "observeinc/connection/aws" },
    { id: "conn-2", name: "aws-dev", moduleID: "observeinc/connection/aws" },
  ]);
});

let list: (typeof import("./list"))["list"];

const deps = {
  loadConfig: loadConfigFn,
} as Parameters<(typeof import("./list"))["list"]>[1];

suppressAnsiColor();

beforeAll(async () => {
  void mock.module(searchConnectionsModulePath, () => ({
    searchConnections: searchConnectionsFn,
  }));

  const mod = await import("./list.ts");
  list = mod.list;
});

afterAll(() => {
  mock.restore();
});

describe("data-connection list", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    searchConnectionsFn.mockClear();
    lastSearchArgs = undefined;
  });

  test("outputs connections as JSON", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, {}, deps);

    expect(searchConnectionsFn).toHaveBeenCalledTimes(1);
    const output = JSON.parse(stdout.join(""));
    expect(output).toHaveLength(2);
    expect(output[0]).toMatchObject({ id: "conn-1", name: "aws-prod" });
  });

  test("forwards --name and --module-id as filters", async () => {
    const { context } = createMockContext();
    await list.call(context, { name: "prod", moduleId: "mod-x" }, deps);

    expect(lastSearchArgs).toMatchObject({
      nameSubstring: "prod",
      moduleId: "mod-x",
    });
  });

  test("exits with code 1 and API Error prefix on GqlApiError", async () => {
    searchConnectionsFn.mockImplementationOnce(() => {
      throw new GqlApiError("Unauthorized", 401);
    });

    const { context, stderr, getExitCode } = createMockContext();
    await list.call(context, {}, deps);

    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("API Error (401)");
    expect(stderr.join("")).toContain("Unauthorized");
  });
});
