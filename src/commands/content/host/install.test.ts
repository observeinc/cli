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
const gqlModulePath = resolve(
  repoRoot,
  "src/gql/content/update-host-content.ts",
);

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

const updateHostContentFn = mock((_config: unknown, _variables: unknown) =>
  Promise.resolve({
    otelLogsDatasetId: "logs-ds-1",
    prometheusDatasetId: "prom-ds-2",
    hostExplorerLogsDatasetId: "host-logs-ds-3",
  }),
);

let install: (typeof import("./install"))["install"];

const deps = {
  loadConfig: loadConfigFn,
} as Parameters<(typeof import("./install"))["install"]>[1];

suppressAnsiColor();

beforeAll(async () => {
  void mock.module(gqlModulePath, () => ({
    updateHostContent: updateHostContentFn,
  }));

  const mod = await import("./install.ts");
  install = mod.install;
});

afterAll(() => {
  mock.restore();
});

describe("content host install", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    updateHostContentFn.mockClear();
  });

  test("passes dataset IDs to updateHostContent", async () => {
    const { context, stdout } = createMockContext();
    await install.call(
      context,
      {
        otelLogsDatasetId: "logs-ds-1",
        prometheusDatasetId: "prom-ds-2",
      },
      deps,
    );

    expect(updateHostContentFn).toHaveBeenCalledTimes(1);
    const [, variables] = updateHostContentFn.mock.calls[0]!;
    expect(variables).toMatchObject({
      input: {
        otelLogsDatasetId: "logs-ds-1",
        prometheusDatasetId: "prom-ds-2",
      },
    });

    const output = JSON.parse(stdout.join(""));
    expect(output.otelLogsDatasetId).toBe("logs-ds-1");
    expect(output.hostExplorerLogsDatasetId).toBe("host-logs-ds-3");
  });

  test("works with no dataset IDs (empty input)", async () => {
    const { context } = createMockContext();
    await install.call(context, {}, deps);

    expect(updateHostContentFn).toHaveBeenCalledTimes(1);
    const [, variables] = updateHostContentFn.mock.calls[0]!;
    expect(variables).toMatchObject({
      input: {},
    });
  });

  test("exits with code 1 on API error", async () => {
    updateHostContentFn.mockImplementationOnce(() => {
      const err = new Error("Unauthorized");
      err.name = "GqlApiError";
      (err as unknown as { statusCode: number }).statusCode = 401;
      throw err;
    });

    const { context, stderr, getExitCode } = createMockContext();
    try {
      await install.call(context, {}, deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });
});
