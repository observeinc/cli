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
const getMetricModulePath = resolve(repoRoot, "src/gql/metric/get-metric.ts");

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

function metricResult() {
  return {
    match: {
      datasetId: "ds-1",
      metric: {
        name: "http.server.duration",
        description: "request latency",
        type: "gauge",
      },
    },
    dataset: { id: "ds-1", name: "OTEL Metrics", kind: "Table" },
  };
}

let resultToReturn:
  | ReturnType<typeof metricResult>
  | { match: null; dataset: null };
let lastGetMetricArgs: { name?: string; datasetId?: string } | undefined;

const getMetricFn = mock(
  (_config: unknown, name: string, datasetId?: string) => {
    lastGetMetricArgs = { name, datasetId };
    return Promise.resolve(resultToReturn);
  },
);

let view: (typeof import("./view"))["view"];

const deps = {
  loadConfig: loadConfigFn,
} as Parameters<(typeof import("./view"))["view"]>[2];

suppressAnsiColor();

beforeAll(async () => {
  void mock.module(getMetricModulePath, () => ({
    getMetric: getMetricFn,
  }));

  const mod = await import("./view.ts");
  view = mod.view;
});

afterAll(() => {
  mock.restore();
});

describe("metric view", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    getMetricFn.mockClear();
    lastGetMetricArgs = undefined;
    resultToReturn = metricResult();
  });

  test("emits metric and dataset as JSON with --json", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, { json: true }, "http.server.duration", deps);

    const payload = JSON.parse(stdout.join("")) as {
      metric: { name: string };
      dataset: { name: string };
    };
    expect(payload.metric.name).toBe("http.server.duration");
    expect(payload.dataset.name).toBe("OTEL Metrics");
  });

  test("forwards the --dataset filter", async () => {
    const { context } = createMockContext();
    await view.call(
      context,
      { json: true, dataset: "ds-1" },
      "http.server.duration",
      deps,
    );
    expect(lastGetMetricArgs).toMatchObject({
      name: "http.server.duration",
      datasetId: "ds-1",
    });
  });

  test("renders the metric name and description by default", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, {}, "http.server.duration", deps);
    const out = stdout.join("");
    expect(out).toContain("http.server.duration");
    expect(out).toContain("request latency");
  });

  test("errors and exits 1 when the metric is not found", async () => {
    resultToReturn = { match: null, dataset: null };
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await view.call(context, {}, "does.not.exist", deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Metric not found: does.not.exist");
  });

  test("exits with code 1 and API Error prefix on GqlApiError", async () => {
    getMetricFn.mockImplementationOnce(() => {
      throw new GqlApiError("nope", 403);
    });
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await view.call(context, {}, "http.server.duration", deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("API Error (403)");
  });
});
