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
const getDatastreamTokenModulePath = resolve(
  repoRoot,
  "src/gql/connection/get-datastream-token.ts",
);

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

// Token returned by getDatastreamToken; mutated per test.
let tokenToReturn: Record<string, unknown>;
const getDatastreamTokenFn = mock((_config: unknown, _variables: unknown) =>
  Promise.resolve(tokenToReturn),
);

let checkStatus: (typeof import("./check-status"))["checkStatus"];

const deps = {
  loadConfig: loadConfigFn,
} as Parameters<(typeof import("./check-status"))["checkStatus"]>[1];

suppressAnsiColor();

beforeAll(async () => {
  void mock.module(getDatastreamTokenModulePath, () => ({
    getDatastreamToken: getDatastreamTokenFn,
  }));

  const mod = await import("./check-status.ts");
  checkStatus = mod.checkStatus;
});

afterAll(() => {
  mock.restore();
});

// The command prints one plain line per poll then a final pretty-printed JSON
// status blob. Each writer.write() is a single stdout entry, so the JSON blob
// is the last entry that parses as an object.
function lastJson(stdout: string[]): unknown {
  for (let i = stdout.length - 1; i >= 0; i--) {
    const trimmed = stdout[i]!.trim();
    if (trimmed.startsWith("{")) {
      return JSON.parse(trimmed);
    }
  }
  throw new Error("no JSON status blob found in stdout");
}

describe("datastream-token check-status", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    getDatastreamTokenFn.mockClear();
    tokenToReturn = { stats: { observations: [] } };
  });

  test("reports 'receiving' as soon as an observation has data", async () => {
    tokenToReturn = {
      id: "tok-1",
      stats: { observations: [{ value: "5" }] },
    };
    const { context, stdout } = createMockContext();
    await checkStatus.call(context, { tokenId: "tok-1" }, deps);

    expect(getDatastreamTokenFn).toHaveBeenCalledTimes(1);
    const result = lastJson(stdout) as { status: string; token: unknown };
    expect(result.status).toBe("receiving");
    expect(result.token).toMatchObject({ id: "tok-1" });
  });

  test("times out to 'no-data' when observations stay empty", async () => {
    tokenToReturn = { stats: { observations: [{ value: "0" }] } };
    const { context, stdout } = createMockContext();
    // Short timeout with a long poll interval → exactly one poll, no sleep.
    await checkStatus.call(
      context,
      { tokenId: "tok-1", timeoutSeconds: 1, pollIntervalSeconds: 100 },
      deps,
    );

    expect(getDatastreamTokenFn).toHaveBeenCalledTimes(1);
    const result = lastJson(stdout) as { status: string };
    expect(result.status).toBe("no-data");
  });

  test("exits with code 1 and API Error prefix on GqlApiError", async () => {
    getDatastreamTokenFn.mockImplementationOnce(() => {
      throw new GqlApiError("nope", 403);
    });
    const { context, stderr, getExitCode } = createMockContext();
    await checkStatus.call(context, { tokenId: "tok-1" }, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("API Error (403)");
  });
});
