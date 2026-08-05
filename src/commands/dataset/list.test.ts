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

let lastListDatasetsArgs:
  | {
      config: Config;
      filter?: string;
      query?: string;
      limit?: number;
      offset?: number;
      orderBy?: string;
    }
  | undefined;

const listDatasetsFn = mock(
  (args: {
    config: Config;
    filter?: string;
    query?: string;
    limit?: number;
    offset?: number;
    orderBy?: string;
  }) => {
    lastListDatasetsArgs = args;
    return Promise.resolve(envelope([datasetStub("42", "rest-result")], 1));
  },
);

let list: (typeof import("./list"))["list"];
let validateDatasetFlags: (typeof import("./list"))["validateDatasetFlags"];

// Backends are injected via `deps` instead of `mock.module`, which is
// process-global in bun and leaks across test files.
const deps = {
  loadConfig: loadConfigFn,
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

  test("allows --filter / --sort / --query / --label / --offset alongside correlation-tag flags", () => {
    expect(() =>
      validateDatasetFlags({
        limit: 10,
        offset: 5,
        filter: "a = 'b'",
        sort: "label",
        query: "checkout latency",
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
    lastListDatasetsArgs = undefined;
  });

  test("calls REST listDatasets when correlation-tag flags are absent", async () => {
    const { context } = createMockContext();
    await list.call(context, { limit: 10, json: true }, deps);
    expect(listDatasetsFn).toHaveBeenCalledTimes(1);
  });

  test("forwards --query to listDatasets alongside a --filter", async () => {
    const { context } = createMockContext();
    await list.call(
      context,
      { limit: 10, json: true, query: "checkout latency", filter: "a = 'b'" },
      deps,
    );
    expect(listDatasetsFn).toHaveBeenCalledTimes(1);
    expect(lastListDatasetsArgs).toMatchObject({
      query: "checkout latency",
      filter: "a = 'b'",
    });
  });

  test("rejects --correlation-tag-value without --correlation-tag-key at runtime", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    await list.call(
      context,
      {
        limit: 10,
        json: true,
        correlationTagValue: "checkout",
      },
      deps,
    );
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("--correlation-tag-value");
    expect(listDatasetsFn).not.toHaveBeenCalled();
  });

  test("routes correlation-tag flags through listDatasets with a hasCorrelationTag filter", async () => {
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
    expect(listDatasetsFn).toHaveBeenCalledTimes(1);
    expect(lastListDatasetsArgs?.filter).toContain(
      'hasCorrelationTag("service.name", "checkout")',
    );
  });

  test("combines --label and --filter with the correlation-tag predicate", async () => {
    const { context } = createMockContext();
    await list.call(
      context,
      {
        limit: 10,
        json: true,
        label: "checkout",
        filter: "kind == 'Event'",
        sort: "label",
        correlationTagKey: "k",
        correlationTagValue: "v",
      },
      deps,
    );
    const filter = lastListDatasetsArgs?.filter ?? "";
    expect(filter).toContain('hasCorrelationTag("k", "v")');
    expect(filter).toContain("kind == 'Event'");
    expect(lastListDatasetsArgs?.orderBy).toBe("label");
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
        label: "rest-result",
        description: "",
        kind: DatasetDatasetKind.Table,
        fieldList: [],
        correlationTags: [],
        foreignKeys: [],
      },
    ]);
  });
});
