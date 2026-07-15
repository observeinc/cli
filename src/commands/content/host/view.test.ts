import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../../test-helpers";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dir, "../../../..");
const gqlModulePath = resolve(repoRoot, "src/gql/content/view-host-content.ts");

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

const getHostContentFn = mock((_config: unknown) =>
  Promise.resolve({
    otelLogsDatasetId: "ds-logs-1",
    prometheusDatasetId: "ds-prom-1",
    hostExplorerLogsDatasetId: "ds-host-logs-1",
  }),
);

let view: (typeof import("./view"))["view"];

const deps = {
  loadConfig: loadConfigFn,
} as Parameters<(typeof import("./view"))["view"]>[0];

suppressAnsiColor();

beforeAll(async () => {
  void mock.module(gqlModulePath, () => ({
    getHostContent: getHostContentFn,
  }));

  const mod = await import("./view.ts");
  view = mod.view;
});

afterAll(() => {
  mock.restore();
});

describe("content host view", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    getHostContentFn.mockClear();
  });

  test("outputs host content dataset IDs", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, deps);

    expect(getHostContentFn).toHaveBeenCalledTimes(1);
    const output = JSON.parse(stdout.join(""));
    expect(output.otelLogsDatasetId).toBe("ds-logs-1");
    expect(output.prometheusDatasetId).toBe("ds-prom-1");
    expect(output.hostExplorerLogsDatasetId).toBe("ds-host-logs-1");
  });

  test("outputs null when no content is installed", async () => {
    getHostContentFn.mockImplementationOnce(
      () => Promise.resolve(null) as never,
    );

    const { context, stdout } = createMockContext();
    await view.call(context, deps);

    const output = JSON.parse(stdout.join(""));
    expect(output).toBeNull();
  });

  test("exits with code 1 on API error", async () => {
    getHostContentFn.mockImplementationOnce(() => {
      const err = new Error("Unauthorized");
      err.name = "GqlApiError";
      (err as unknown as { statusCode: number }).statusCode = 401;
      throw err;
    });

    const { context, stderr, getExitCode } = createMockContext();
    await view.call(context, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });
});
