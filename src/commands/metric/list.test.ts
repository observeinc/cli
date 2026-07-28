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
import type { GqlMetricMatch } from "../../gql/metric/list-metrics";

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

function metricStub(name: string, datasetId: string): GqlMetricMatch {
  return {
    datasetId,
    metric: {
      name,
      nameWithPath: "",
      description: "",
      type: "" as GqlMetricMatch["metric"]["type"],
      unit: "",
      aggregate: "",
      rollup: "",
      state: "" as GqlMetricMatch["metric"]["state"],
      interval: null,
      userDefined: false,
    },
  };
}

function envelope(matches: GqlMetricMatch[], numSearched = "-1") {
  return { matches, numSearched, datasets: [] };
}

const listMetricsViaGqlFn = mock((_config: Config, _vars: unknown) =>
  Promise.resolve(envelope([metricStub("gql.metric", "ds-1")], "1")),
);

let lastSearchKGArgs:
  | {
      config: Config;
      correlationTagKey: string;
      correlationTagValue: string;
      match?: string;
      limit?: number;
      offset?: number;
    }
  | undefined;

let searchKGReturn = envelope([metricStub("kg.metric", "ds-42")]);

const searchMetricsViaKGFn = mock(
  (args: {
    config: Config;
    correlationTagKey: string;
    correlationTagValue: string;
    match?: string;
    limit?: number;
    offset?: number;
  }) => {
    lastSearchKGArgs = args;
    return Promise.resolve(searchKGReturn);
  },
);

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

// Inject backends via `deps` instead of `mock.module` so the wrapper-level
// tests in `src/rest/metric/search-metrics-kg.test.ts` aren't affected by
// bun's process-global module mocks.
const deps = {
  loadConfig: loadConfigFn,
  searchMetricsViaKG: searchMetricsViaKGFn,
  listMetricsViaGql: listMetricsViaGqlFn,
  listMetrics: listMetricsFn,
  isExperimentalEnabled: () => false,
} as Parameters<(typeof import("./list"))["list"]>[1];

// Same backends, but with the experimental (REST API) gate forced on.
const experimentalDeps = {
  loadConfig: loadConfigFn,
  searchMetricsViaKG: searchMetricsViaKGFn,
  listMetricsViaGql: listMetricsViaGqlFn,
  listMetrics: listMetricsFn,
  isExperimentalEnabled: () => true,
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
    listMetricsViaGqlFn.mockClear();
    searchMetricsViaKGFn.mockClear();
    listMetricsFn.mockClear();
    lastSearchKGArgs = undefined;
    lastListRestArgs = undefined;
    searchKGReturn = envelope([metricStub("kg.metric", "ds-42")]);
  });

  test("routes to GraphQL metricSearch when correlation-tag flags are absent", async () => {
    const { context } = createMockContext();
    await list.call(context, { limit: 10, match: "", json: true }, deps);
    expect(listMetricsViaGqlFn).toHaveBeenCalledTimes(1);
    expect(searchMetricsViaKGFn).not.toHaveBeenCalled();
    expect(listMetricsFn).not.toHaveBeenCalled();
  });

  test("routes to searchMetricsViaKG when both correlation-tag flags are set", async () => {
    const { context } = createMockContext();
    await list.call(
      context,
      {
        limit: 10,
        match: "",
        json: true,
        correlationTagKey: "service.name",
        correlationTagValue: "checkout",
      },
      deps,
    );
    expect(searchMetricsViaKGFn).toHaveBeenCalledTimes(1);
    expect(listMetricsViaGqlFn).not.toHaveBeenCalled();
    expect(lastSearchKGArgs).toMatchObject({
      correlationTagKey: "service.name",
      correlationTagValue: "checkout",
    });
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
    expect(listMetricsViaGqlFn).not.toHaveBeenCalled();
    expect(searchMetricsViaKGFn).not.toHaveBeenCalled();
  });

  test("forwards --match / --limit / --offset to searchMetricsViaKG", async () => {
    const { context } = createMockContext();
    await list.call(
      context,
      {
        limit: 25,
        match: "cpu",
        offset: 5,
        json: true,
        correlationTagKey: "service.name",
        correlationTagValue: "checkout",
      },
      deps,
    );
    expect(lastSearchKGArgs).toMatchObject({
      correlationTagKey: "service.name",
      correlationTagValue: "checkout",
      match: "cpu",
      limit: 25,
      offset: 5,
    });
  });

  test("omits --match when flag is empty so wrapper does not filter", async () => {
    const { context } = createMockContext();
    await list.call(
      context,
      {
        limit: 10,
        match: "",
        json: true,
        correlationTagKey: "k",
        correlationTagValue: "v",
      },
      deps,
    );
    expect(lastSearchKGArgs).toMatchObject({
      correlationTagKey: "k",
      correlationTagValue: "v",
      limit: 10,
    });
    expect(lastSearchKGArgs?.match).toBeUndefined();
    expect(lastSearchKGArgs?.offset).toBeUndefined();
  });

  test("experimental path builds a name filter for the REST listMetrics", async () => {
    const { context } = createMockContext();
    await list.call(
      context,
      { limit: 10, match: "cpu", json: true },
      experimentalDeps,
    );
    expect(listMetricsFn).toHaveBeenCalledTimes(1);
    expect(listMetricsViaGqlFn).not.toHaveBeenCalled();
    expect(searchMetricsViaKGFn).not.toHaveBeenCalled();
    expect(lastListRestArgs?.limit).toBe(10);
    expect(lastListRestArgs?.filter).toContain(
      'name.lowerAscii().contains("cpu".lowerAscii())',
    );
    expect(lastListRestArgs?.filter).not.toContain("hasCorrelationTag");
  });

  test("experimental path builds a hasCorrelationTag filter for the REST listMetrics", async () => {
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
      experimentalDeps,
    );
    expect(listMetricsFn).toHaveBeenCalledTimes(1);
    expect(searchMetricsViaKGFn).not.toHaveBeenCalled();
    expect(lastListRestArgs).toMatchObject({ limit: 25, offset: 5 });
    expect(lastListRestArgs?.filter).toBe(
      'hasCorrelationTag("service.name", "checkout")',
    );
  });
});

describe("metric list rendering", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    listMetricsViaGqlFn.mockClear();
    searchMetricsViaKGFn.mockClear();
  });

  test("--json emits the GQL metric match shape directly", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 10, match: "", json: true }, deps);
    const payload: unknown = JSON.parse(stdout.join(""));
    expect(payload).toEqual([
      {
        datasetId: "ds-1",
        metric: {
          name: "gql.metric",
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
