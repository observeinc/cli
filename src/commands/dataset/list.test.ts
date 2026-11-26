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
import {
  DatasetDatasetKind,
  type DatasetListResponse,
  type DatasetResource,
} from "../../rest/generated";

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
  return {
    datasets: rows,
    meta: { totalCount, limit: 100, hasMore: false, nextOffset: null },
  };
}

function datasetStubs(count: number, firstId = 0) {
  return Array.from({ length: count }, (_, i) =>
    datasetStub(String(firstId + i), `dataset-${firstId + i}`),
  );
}

interface ListDatasetsArgs {
  limit?: number;
  offset?: number;
  query?: string;
}

/**
 * Deps whose listDatasets returns `pages` in order and records each request.
 * A page's `meta` is passed through as is, so a page can omit `hasMore` and
 * `nextOffset` to stand in for a server that predates them.
 */
function pagedDeps(pages: { datasets: DatasetResource[]; meta: object }[]) {
  const requests: ListDatasetsArgs[] = [];
  const listDatasetsFromPages = mock((args: ListDatasetsArgs) => {
    requests.push({
      limit: args.limit,
      offset: args.offset,
      query: args.query,
    });
    const page = pages[requests.length - 1];
    if (!page) throw new Error(`unexpected request #${requests.length}`);
    return Promise.resolve(page as unknown as DatasetListResponse);
  });
  return {
    requests,
    deps: {
      loadConfig: loadConfigFn,
      listDatasets: listDatasetsFromPages,
    } as unknown as Parameters<(typeof import("./list"))["list"]>[1],
  };
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

  test("allows --filter / --sort / --query / --match / --offset alongside correlation-tag flags", () => {
    expect(() =>
      validateDatasetFlags({
        limit: 10,
        offset: 5,
        filter: "a = 'b'",
        sort: "label",
        query: "checkout latency",
        match: "checkout",
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

  test("combines --match and --filter with the correlation-tag predicate", async () => {
    const { context } = createMockContext();
    await list.call(
      context,
      {
        limit: 10,
        json: true,
        match: "checkout",
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

  test("accepts the deprecated --label as an alias for --match", async () => {
    const { context } = createMockContext();
    await list.call(
      context,
      { limit: 10, json: true, label: "checkout" },
      deps,
    );
    expect(lastListDatasetsArgs?.filter).toBe(
      'label.lowerAscii().contains("checkout".lowerAscii())',
    );
  });

  test("--match wins when both --match and --label are supplied", async () => {
    const { context } = createMockContext();
    await list.call(
      context,
      { limit: 10, json: true, match: "winner", label: "loser" },
      deps,
    );
    const filter = lastListDatasetsArgs?.filter ?? "";
    expect(filter).toContain('"winner"');
    expect(filter).not.toContain("loser");
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

describe("dataset list paging", () => {
  test("fetches a --limit above the server's page size 100 at a time", async () => {
    const { context, stdout } = createMockContext();
    const { deps: pageDeps, requests } = pagedDeps([
      {
        datasets: datasetStubs(100, 0),
        meta: { totalCount: 900, limit: 100, hasMore: true, nextOffset: 100 },
      },
      {
        datasets: datasetStubs(100, 100),
        meta: { totalCount: 900, limit: 100, hasMore: true, nextOffset: 200 },
      },
      {
        datasets: datasetStubs(50, 200),
        meta: { totalCount: 900, limit: 50, hasMore: true, nextOffset: 250 },
      },
    ]);

    await list.call(context, { limit: 250, json: true }, pageDeps);

    expect(requests).toEqual([
      { limit: 100, offset: 0, query: undefined },
      { limit: 100, offset: 100, query: undefined },
      { limit: 50, offset: 200, query: undefined },
    ]);
    const payload = JSON.parse(stdout.join("")) as { id: string }[];
    expect(payload).toHaveLength(250);
    expect(payload[249]?.id).toBe("249");
  });

  test("stops when the server reports no more datasets", async () => {
    const { context, stdout, stderr } = createMockContext();
    const { deps: pageDeps, requests } = pagedDeps([
      {
        datasets: datasetStubs(30),
        meta: { totalCount: 30, limit: 100, hasMore: false, nextOffset: null },
      },
    ]);

    await list.call(context, { limit: 500 }, pageDeps);

    expect(requests).toHaveLength(1);
    const output = stdout.join("") + stderr.join("");
    expect(output).toContain("Found 30 dataset(s) (30 total)");
    expect(output).not.toContain("More results may be available");
  });

  test("follows the server's nextOffset rather than offset + limit", async () => {
    const { context, stdout, stderr } = createMockContext();
    const { deps: pageDeps, requests } = pagedDeps([
      {
        datasets: datasetStubs(7, 0),
        meta: { totalCount: 40, limit: 10, hasMore: true, nextOffset: 10 },
      },
      {
        datasets: datasetStubs(3, 10),
        meta: { totalCount: 40, limit: 3, hasMore: true, nextOffset: 13 },
      },
    ]);

    await list.call(context, { limit: 10 }, pageDeps);

    expect(requests).toEqual([
      { limit: 10, offset: 0, query: undefined },
      { limit: 3, offset: 10, query: undefined },
    ]);
    expect(stdout.join("") + stderr.join("")).toContain("Use --offset 13");
  });

  test("pages by page fullness on a server without hasMore and nextOffset", async () => {
    const { context, stdout, stderr } = createMockContext();
    const { deps: pageDeps, requests } = pagedDeps([
      { datasets: datasetStubs(100, 0), meta: { totalCount: 400 } },
      { datasets: datasetStubs(50, 100), meta: { totalCount: 400 } },
    ]);

    await list.call(context, { limit: 150 }, pageDeps);

    expect(requests).toEqual([
      { limit: 100, offset: 0, query: undefined },
      { limit: 50, offset: 100, query: undefined },
    ]);
    const output = stdout.join("") + stderr.join("");
    expect(output).toContain("Found 150 dataset(s) (400 total)");
    expect(output).toContain("Use --offset 150");
  });

  test("does not page --query past the semantic search offset limit", async () => {
    const { context, stdout, stderr } = createMockContext();
    const { deps: pageDeps, requests } = pagedDeps([
      {
        datasets: datasetStubs(100, 950),
        meta: { totalCount: -1, limit: 100, hasMore: true, nextOffset: 1050 },
      },
    ]);

    await list.call(
      context,
      { limit: 200, offset: 950, query: "checkout latency" },
      pageDeps,
    );

    expect(requests).toEqual([
      { limit: 100, offset: 950, query: "checkout latency" },
    ]);
    expect(stdout.join("") + stderr.join("")).not.toContain(
      "More results may be available",
    );
  });
});
