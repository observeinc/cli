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
import type { MetricMatch } from "../../rest/metric/list-metrics";

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

function metricStub(name: string, datasetId: string): MetricMatch {
  return {
    datasetId,
    metric: {
      name,
      nameWithPath: "",
      description: "",
      type: "" as MetricMatch["metric"]["type"],
      unit: "",
      aggregate: "",
      rollup: "",
      state: "" as MetricMatch["metric"]["state"],
      interval: null,
      userDefined: false,
    },
  };
}

function envelope(matches: MetricMatch[], numSearched = "-1") {
  return { matches, numSearched };
}

let lastListRestArgs:
  | {
      config: Config;
      filter?: string;
      limit?: number;
      offset?: number;
    }
  | undefined;

const listMetricsFn = mock(
  (args: {
    config: Config;
    filter?: string;
    limit?: number;
    offset?: number;
  }) => {
    lastListRestArgs = args;
    return Promise.resolve(envelope([metricStub("rest.metric", "ds-9")]));
  },
);

let list: (typeof import("./list"))["list"];
let validateMetricFlags: (typeof import("./list"))["validateMetricFlags"];

// Backends are injected via `deps` instead of `mock.module`, which is
// process-global in bun and leaks across test files.
const deps = {
  loadConfig: loadConfigFn,
  listMetrics: listMetricsFn,
} as Parameters<(typeof import("./list"))["list"]>[1];

suppressAnsiColor();

beforeAll(async () => {
  const mod = await import("./list.ts");
  list = mod.list;
  validateMetricFlags = mod.validateMetricFlags;
});

afterAll(() => {
  mock.restore();
});

describe("validateMetricFlags", () => {
  test("no-op when correlation-tag flags are absent", () => {
    expect(() => validateMetricFlags({ limit: 10, match: "" })).not.toThrow();
  });

  test("rejects --correlation-tag-value without --correlation-tag-key", () => {
    expect(() =>
      validateMetricFlags({
        limit: 10,
        match: "",
        correlationTagValue: "checkout",
      }),
    ).toThrow(/--correlation-tag-value requires --correlation-tag-key/);
  });

  test("rejects --correlation-tag-key without --correlation-tag-value", () => {
    expect(() =>
      validateMetricFlags({
        limit: 10,
        match: "",
        correlationTagKey: "service.name",
      }),
    ).toThrow(/--correlation-tag-key requires --correlation-tag-value/);
  });

  test("allows both correlation-tag flags together", () => {
    expect(() =>
      validateMetricFlags({
        limit: 10,
        match: "",
        correlationTagKey: "k",
        correlationTagValue: "v",
      }),
    ).not.toThrow();
  });
});

describe("metric list routing", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    listMetricsFn.mockClear();
    lastListRestArgs = undefined;
  });

  test("rejects --correlation-tag-value without --correlation-tag-key at runtime", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    await list.call(
      context,
      {
        limit: 10,
        match: "",
        json: true,
        correlationTagValue: "checkout",
      },
      deps,
    );
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("--correlation-tag-value");
    expect(listMetricsFn).not.toHaveBeenCalled();
  });

  test("builds a name filter for the REST listMetrics", async () => {
    const { context } = createMockContext();
    await list.call(context, { limit: 10, match: "cpu", json: true }, deps);
    expect(listMetricsFn).toHaveBeenCalledTimes(1);
    expect(lastListRestArgs?.limit).toBe(10);
    expect(lastListRestArgs?.filter).toContain(
      'name.lowerAscii().contains("cpu".lowerAscii())',
    );
    expect(lastListRestArgs?.filter).not.toContain("hasCorrelationTag");
  });

  test("builds a hasCorrelationTag filter for the REST listMetrics", async () => {
    const { context } = createMockContext();
    await list.call(
      context,
      {
        limit: 25,
        match: "",
        offset: 5,
        json: true,
        correlationTagKey: "service.name",
        correlationTagValue: "checkout",
      },
      deps,
    );
    expect(listMetricsFn).toHaveBeenCalledTimes(1);
    expect(lastListRestArgs).toMatchObject({ limit: 25, offset: 5 });
    expect(lastListRestArgs?.filter).toBe(
      'hasCorrelationTag("service.name", "checkout")',
    );
  });
});

describe("metric list rendering", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    listMetricsFn.mockClear();
  });

  test("--json emits the metric match shape directly", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 10, match: "", json: true }, deps);
    const payload: unknown = JSON.parse(stdout.join(""));
    expect(payload).toEqual([
      {
        datasetId: "ds-9",
        metric: {
          name: "rest.metric",
          nameWithPath: "",
          description: "",
          type: "",
          unit: "",
          aggregate: "",
          rollup: "",
          state: "",
          interval: null,
          userDefined: false,
        },
      },
    ]);
  });
});
