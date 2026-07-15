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
  "src/gql/content/view-tracing-content.ts",
);

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

const getTracingContentFn = mock((_config: unknown) =>
  Promise.resolve({
    traceDatasetId: "trace-ds-1",
    spanRawDatasetId: "span-raw-1",
    spanEventDatasetId: "span-event-1",
    spanLinkDatasetId: "span-link-1",
    otelMetricsDatasetId: "otel-metrics-1",
  }),
);

let view: (typeof import("./view"))["view"];

const deps = {
  loadConfig: loadConfigFn,
} as Parameters<(typeof import("./view"))["view"]>[0];

suppressAnsiColor();

beforeAll(async () => {
  void mock.module(gqlModulePath, () => ({
    getTracingContent: getTracingContentFn,
  }));

  const mod = await import("./view.ts");
  view = mod.view;
});

afterAll(() => {
  mock.restore();
});

describe("content tracing view", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    getTracingContentFn.mockClear();
  });

  test("outputs tracing content dataset IDs", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, deps);

    expect(getTracingContentFn).toHaveBeenCalledTimes(1);
    const output = JSON.parse(stdout.join(""));
    expect(output.traceDatasetId).toBe("trace-ds-1");
    expect(output.spanRawDatasetId).toBe("span-raw-1");
    expect(output.spanEventDatasetId).toBe("span-event-1");
    expect(output.spanLinkDatasetId).toBe("span-link-1");
    expect(output.otelMetricsDatasetId).toBe("otel-metrics-1");
  });

  test("outputs null when no tracing content is installed", async () => {
    getTracingContentFn.mockImplementationOnce(
      () => Promise.resolve(null) as never,
    );

    const { context, stdout } = createMockContext();
    await view.call(context, deps);

    const output = JSON.parse(stdout.join(""));
    expect(output).toBeNull();
  });

  test("exits with code 1 on API error", async () => {
    getTracingContentFn.mockImplementationOnce(() => {
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
