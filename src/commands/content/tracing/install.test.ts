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
  "src/gql/content/install-tracing-content.ts",
);

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

const installTracingContentFn = mock((_config: unknown, _variables: unknown) =>
  Promise.resolve({
    traceDatasetId: "trace-ds-1",
    spanRawDatasetId: "span-raw-1",
    spanEventDatasetId: "span-event-1",
    spanLinkDatasetId: "span-link-1",
    otelMetricsDatasetId: "otel-metrics-1",
  }),
);

let install: (typeof import("./install"))["install"];

const deps = {
  loadConfig: loadConfigFn,
} as Parameters<(typeof import("./install"))["install"]>[1];

suppressAnsiColor();

beforeAll(async () => {
  void mock.module(gqlModulePath, () => ({
    installTracingContent: installTracingContentFn,
  }));

  const mod = await import("./install.ts");
  install = mod.install;
});

afterAll(() => {
  mock.restore();
});

describe("content tracing install", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    installTracingContentFn.mockClear();
  });

  test("passes dataset IDs to installTracingContent and outputs result", async () => {
    const { context, stdout } = createMockContext();
    await install.call(
      context,
      {
        spanRawDatasetId: "span-raw-1",
        spanEventDatasetId: "span-event-1",
        spanLinkDatasetId: "span-link-1",
        otelMetricsDatasetId: "otel-metrics-1",
      },
      deps,
    );

    expect(installTracingContentFn).toHaveBeenCalledTimes(1);
    const [, variables] = installTracingContentFn.mock.calls[0]!;
    expect(
      (variables as { input: Record<string, string> }).input,
    ).toMatchObject({
      spanRawDatasetId: "span-raw-1",
      spanEventDatasetId: "span-event-1",
      spanLinkDatasetId: "span-link-1",
      otelMetricsDatasetId: "otel-metrics-1",
    });

    const output = JSON.parse(stdout.join(""));
    expect(output.traceDatasetId).toBe("trace-ds-1");
  });

  test("passes undefined input when no dataset flags provided", async () => {
    const { context } = createMockContext();
    await install.call(context, {}, deps);

    const [, variables] = installTracingContentFn.mock.calls[0]!;
    expect((variables as { input: unknown }).input).toBeUndefined();
  });

  test("exits with code 1 on API error", async () => {
    installTracingContentFn.mockImplementationOnce(() => {
      const err = new Error("Content already exists");
      err.name = "GqlApiError";
      (err as unknown as { statusCode: number }).statusCode = 409;
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
