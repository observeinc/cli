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
const getConnectionModulePath = resolve(
  repoRoot,
  "src/gql/connection/get-connection.ts",
);

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

let lastGetArgs: unknown;
const getConnectionFn = mock((_config: unknown, variables: unknown) => {
  lastGetArgs = variables;
  return Promise.resolve({
    id: "conn-1",
    name: "aws-prod",
    moduleID: "observeinc/connection/aws",
    variables: [],
    datasources: [],
  });
});

let view: (typeof import("./view"))["view"];

const deps = {
  loadConfig: loadConfigFn,
} as Parameters<(typeof import("./view"))["view"]>[2];

suppressAnsiColor();

beforeAll(async () => {
  void mock.module(getConnectionModulePath, () => ({
    getConnection: getConnectionFn,
  }));

  const mod = await import("./view.ts");
  view = mod.view;
});

afterAll(() => {
  mock.restore();
});

describe("data-connection view", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    getConnectionFn.mockClear();
    lastGetArgs = undefined;
  });

  test("outputs the connection as JSON and passes the id", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, {}, "conn-1", deps);

    expect(getConnectionFn).toHaveBeenCalledTimes(1);
    expect(lastGetArgs).toMatchObject({ id: "conn-1" });
    const output = JSON.parse(stdout.join(""));
    expect(output).toMatchObject({ id: "conn-1", name: "aws-prod" });
  });

  test("exits with code 1 and API Error prefix on GqlApiError", async () => {
    getConnectionFn.mockImplementationOnce(() => {
      throw new GqlApiError("Not found", 404);
    });

    const { context, stderr, getExitCode } = createMockContext();
    try {
      await view.call(context, {}, "missing", deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }

    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("API Error (404)");
  });
});
