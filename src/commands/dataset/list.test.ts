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
import { DatasetDatasetKind, type DatasetResource } from "../../rest/generated";

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

function datasetStub(id: string, label: string): DatasetResource {
  return {
    id,
    label,
    description: "",
    kind: DatasetDatasetKind.Table,
    fieldList: [],
    correlationTags: [],
    foreignKeys: [],
  } as unknown as DatasetResource;
}

function envelope(rows: DatasetResource[], totalCount = -1) {
  return { datasets: rows, meta: { totalCount } };
}

const listDatasetsFn = mock(
  (_args: {
    config: Config;
    filter?: string;
    limit?: number;
    offset?: number;
    orderBy?: string;
  }) => Promise.resolve(envelope([datasetStub("42", "native-result")], 1)),
);

let lastSearchKGArgs:
  | {
      config: Config;
      correlationTagKey: string;
      correlationTagValue: string;
      label?: string;
      limit?: number;
      offset?: number;
    }
  | undefined;

let searchKGReturn = envelope([
  datasetStub("kg-1", "alpha-service"),
  datasetStub("kg-2", "beta-service"),
]);

const searchDatasetsViaKGFn = mock(
  (args: {
    config: Config;
    correlationTagKey: string;
    correlationTagValue: string;
    label?: string;
    limit?: number;
    offset?: number;
  }) => {
    lastSearchKGArgs = args;
    return Promise.resolve(searchKGReturn);
  },
);

let list: (typeof import("./list"))["list"];
let validateDatasetFlags: (typeof import("./list"))["validateDatasetFlags"];

// Inject backends via `deps` instead of `mock.module` so the wrapper-level
// tests in `src/rest/dataset/search-datasets-kg.test.ts` aren't affected by
// bun's process-global module mocks.
const deps = {
  loadConfig: loadConfigFn,
  searchDatasetsViaKG: searchDatasetsViaKGFn,
  listDatasets: listDatasetsFn,
} as Parameters<(typeof import("./list"))["list"]>[1];

suppressAnsiColor();

beforeAll(async () => {
  const mod = await import("./list.ts");
  list = mod.list;
  validateDatasetFlags = mod.validateDatasetFlags;
});

afterAll(() => {
  mock.restore();
});

describe("validateDatasetFlags", () => {
  test("no-op when correlation-tag flags are not set", () => {
    expect(() =>
      validateDatasetFlags({ limit: 10, filter: "foo", sort: "label" }),
    ).not.toThrow();
  });

  test("rejects --correlation-tag-value without --correlation-tag-key", () => {
    expect(() =>
      validateDatasetFlags({
        limit: 10,
        correlationTagValue: "checkout",
      }),
    ).toThrow(/--correlation-tag-value requires --correlation-tag-key/);
  });

  test("rejects --correlation-tag-key without --correlation-tag-value", () => {
    expect(() =>
      validateDatasetFlags({
        limit: 10,
        correlationTagKey: "service.name",
      }),
    ).toThrow(/--correlation-tag-key requires --correlation-tag-value/);
  });

  test("rejects --filter combined with correlation-tag flags", () => {
    expect(() =>
      validateDatasetFlags({
        limit: 10,
        filter: "a = 'b'",
        correlationTagKey: "k",
        correlationTagValue: "v",
      }),
    ).toThrow(/--filter.*--correlation-tag-key/);
  });

  test("rejects --sort combined with correlation-tag flags", () => {
    expect(() =>
      validateDatasetFlags({
        limit: 10,
        sort: "label",
        correlationTagKey: "k",
        correlationTagValue: "v",
      }),
    ).toThrow(/--sort.*--correlation-tag-key/);
  });

  test("allows --offset with correlation-tag flags (applied client-side)", () => {
    expect(() =>
      validateDatasetFlags({
        limit: 10,
        offset: 5,
        correlationTagKey: "k",
        correlationTagValue: "v",
      }),
    ).not.toThrow();
  });

  test("combines multiple offenders into one error", () => {
    expect(() =>
      validateDatasetFlags({
        limit: 10,
        filter: "x",
        sort: "label",
        correlationTagKey: "k",
        correlationTagValue: "v",
      }),
    ).toThrow(/--filter, --sort.*--correlation-tag-key/);
  });

  test("allows --label with correlation-tag flags (applied client-side)", () => {
    expect(() =>
      validateDatasetFlags({
        limit: 10,
        label: "checkout",
        correlationTagKey: "k",
        correlationTagValue: "v",
      }),
    ).not.toThrow();
  });
});

describe("dataset list routing", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    listDatasetsFn.mockClear();
    searchDatasetsViaKGFn.mockClear();
    lastSearchKGArgs = undefined;
    searchKGReturn = envelope([
      datasetStub("kg-1", "alpha-service"),
      datasetStub("kg-2", "beta-service"),
    ]);
  });

  test("routes to native listDatasets when correlation-tag flags are absent", async () => {
    const { context } = createMockContext();
    await list.call(context, { limit: 10, json: true }, deps);
    expect(listDatasetsFn).toHaveBeenCalledTimes(1);
    expect(searchDatasetsViaKGFn).not.toHaveBeenCalled();
  });

  test("routes to searchDatasetsViaKG when both correlation-tag flags are set", async () => {
    const { context } = createMockContext();
    await list.call(
      context,
      {
        limit: 10,
        json: true,
        correlationTagKey: "service.name",
        correlationTagValue: "checkout",
      },
      deps,
    );
    expect(searchDatasetsViaKGFn).toHaveBeenCalledTimes(1);
    expect(listDatasetsFn).not.toHaveBeenCalled();
    expect(lastSearchKGArgs).toMatchObject({
      correlationTagKey: "service.name",
      correlationTagValue: "checkout",
    });
  });

  test("rejects --correlation-tag-value without --correlation-tag-key at runtime", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await list.call(
        context,
        {
          limit: 10,
          json: true,
          correlationTagValue: "checkout",
        },
        deps,
      );
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("--correlation-tag-value");
    expect(listDatasetsFn).not.toHaveBeenCalled();
    expect(searchDatasetsViaKGFn).not.toHaveBeenCalled();
  });

  test("rejects incompatible flags before calling any backend", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await list.call(
        context,
        {
          limit: 10,
          json: true,
          filter: "a = 'b'",
          correlationTagKey: "k",
          correlationTagValue: "v",
        },
        deps,
      );
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("--filter");
    expect(listDatasetsFn).not.toHaveBeenCalled();
    expect(searchDatasetsViaKGFn).not.toHaveBeenCalled();
  });

  test("forwards --label / --limit / --offset to searchDatasetsViaKG", async () => {
    const { context } = createMockContext();
    await list.call(
      context,
      {
        limit: 25,
        offset: 5,
        label: "checkout",
        json: true,
        correlationTagKey: "service.name",
        correlationTagValue: "checkout",
      },
      deps,
    );
    expect(lastSearchKGArgs).toMatchObject({
      correlationTagKey: "service.name",
      correlationTagValue: "checkout",
      label: "checkout",
      limit: 25,
      offset: 5,
    });
  });

  test("omits --label / --offset when flags are unset", async () => {
    const { context } = createMockContext();
    await list.call(
      context,
      {
        limit: 10,
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
    expect(lastSearchKGArgs?.label).toBeUndefined();
    expect(lastSearchKGArgs?.offset).toBeUndefined();
  });

  test("emits DatasetResource shape in JSON output", async () => {
    const { context, stdout } = createMockContext();
    await list.call(
      context,
      {
        limit: 10,
        json: true,
      },
      deps,
    );
    const payload: unknown = JSON.parse(stdout.join(""));
    expect(payload).toEqual([
      {
        id: "42",
        label: "native-result",
        description: "",
        kind: DatasetDatasetKind.Table,
        fieldList: [],
        correlationTags: [],
        foreignKeys: [],
      },
    ]);
  });
});
