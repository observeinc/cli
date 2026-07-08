import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import { createMockContext, suppressAnsiColor } from "../test-helpers";
import type { Config } from "../lib/config";
import type { DatasetResource } from "../rest/generated";
import type {
  DatasetQueryOutputQueryVariables,
  StageInput,
} from "../gql/generated/graphql";

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

function datasetStub(
  id: string,
  label: string,
  fieldList: DatasetResource["fieldList"] = [],
): DatasetResource {
  return {
    id,
    label,
    fieldList,
  } as DatasetResource;
}

const getDatasetFn = mock(({ id }: { config: Config; id: string }) => {
  if (id === "10") return Promise.resolve(datasetStub("10", "  Alpha Logs  "));
  if (id === "20") return Promise.resolve(datasetStub("20", "Beta"));
  if (id === "30") return Promise.resolve(datasetStub("30", "Gamma"));
  return Promise.reject(new Error(`unexpected dataset id in test: ${id}`));
});

let lastQueryArgs:
  | { config: Config; variables: DatasetQueryOutputQueryVariables }
  | undefined;

function getLastQueryArgsOrThrow() {
  if (lastQueryArgs === undefined) {
    throw new Error("expected datasetQueryOutput to have been called");
  }
  return lastQueryArgs;
}

function getStageOrThrow(
  variables: DatasetQueryOutputQueryVariables,
): StageInput {
  const queryArr = variables.query as StageInput[];
  const stage = queryArr[0];
  if (!stage) {
    throw new Error("expected at least one stage in the query");
  }
  return stage;
}

const datasetQueryOutputFn = mock(
  (args: { config: Config; variables: DatasetQueryOutputQueryVariables }) => {
    lastQueryArgs = args;
    return Promise.resolve([
      {
        __typename: "TaskResult" as const,
        queryId: "q1",
        stageId: "main",
        resultKind: "ResultKindSchema" as const,
        resultSchema: {
          __typename: "TaskResultSchema" as const,
          fieldList: [
            {
              __typename: "FieldDesc" as const,
              name: "msg",
              type: {
                __typename: "FieldType" as const,
                tag: "STRING" as const,
              },
            },
          ],
        },
        paginatedResults: null,
        errors: null,
      },
      {
        __typename: "TaskResult" as const,
        queryId: "q1",
        stageId: "main",
        resultKind: "ResultKindData" as const,
        resultSchema: null,
        paginatedResults: {
          numRows: 1,
          offset: 0,
          totalRows: 1,
          columns: [["hello"]],
        },
        errors: null,
      },
    ]);
  },
);

let query: (typeof import("./query"))["query"];

let previousHome: string | undefined;

/** Strip CSI SGR sequences so stdout parsing is stable when chalk adds color. */
function stripAnsi(text: string): string {
  const esc = String.fromCharCode(0x1b);
  return text.replaceAll(new RegExp(`${esc}\\[[0-9;]*m`, "gu"), "");
}

// Inject backends via `deps` instead of `mock.module` to avoid bun's
// process-global module mocks leaking into sibling test files.
const deps = {
  loadConfig: loadConfigFn,
  getDataset: getDatasetFn,
  datasetQueryOutput: datasetQueryOutputFn,
} as unknown as Parameters<(typeof import("./query"))["query"]>[1];

suppressAnsiColor();

beforeAll(async () => {
  previousHome = process.env.HOME;
  process.env.HOME = `/tmp/observe-query-test-no-config-${Date.now()}`;

  const mod = await import("./query.ts");
  query = mod.query;
});

afterAll(() => {
  mock.restore();
  if (previousHome === undefined) {
    delete process.env.HOME;
  } else {
    process.env.HOME = previousHome;
  }
});

describe("query command", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    getDatasetFn.mockClear();
    datasetQueryOutputFn.mockClear();
    lastQueryArgs = undefined;
  });

  test("exits when no --input values are provided", async () => {
    const { context, stderr, getExitCode } = createMockContext();

    try {
      await query.call(
        context,
        {
          input: [],
          limit: 10,
        },
        deps,
      );
      throw new Error("expected process.exit");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("process.exit");
    }

    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("At least one --input");
    expect(getDatasetFn).not.toHaveBeenCalled();
  });

  test("dedupes duplicate dataset ids and preserves first-seen order", async () => {
    const { context } = createMockContext();

    await query.call(
      context,
      {
        input: ["10", "10", "20", "10"],
        limit: 5,
        json: true,
      },
      deps,
    );

    expect(getDatasetFn).toHaveBeenCalledTimes(2);
    expect(getDatasetFn.mock.calls[0]?.[0].config).toMatchObject({
      customerId: "test-customer",
      token: "test-token",
      domain: "observeinc.com",
    });
    const seenIds = getDatasetFn.mock.calls.map((c) => c[0].id);
    expect(seenIds).toEqual(["10", "20"]);
  });

  test("sends stage inputs using dataset ids as inputName", async () => {
    const { context } = createMockContext();

    await query.call(
      context,
      {
        input: ["10", "20"],
        pipeline: "filter true",
        limit: 25,
        json: true,
      },
      deps,
    );

    expect(datasetQueryOutputFn).toHaveBeenCalledTimes(1);

    const args = getLastQueryArgsOrThrow();
    const stage = getStageOrThrow(args.variables);
    expect(stage.pipeline).toBe("filter true");
    expect(stage.inputs).toEqual([
      { inputName: "10", datasetId: "10" },
      { inputName: "20", datasetId: "20" },
    ]);
    expect(stage.pagination?.initialRows).toBe("25");
  });

  test("derives start/end times from interval when not explicit", async () => {
    const { context } = createMockContext();

    await query.call(
      context,
      {
        input: ["30"],
        limit: 10,
        json: true,
        interval: "4h",
      },
      deps,
    );

    const args = getLastQueryArgsOrThrow();
    expect(typeof args.variables.params.startTime).toBe("string");
    expect(typeof args.variables.params.endTime).toBe("string");

    const start = new Date(args.variables.params.startTime as string).getTime();
    const end = new Date(args.variables.params.endTime as string).getTime();
    expect(end - start).toBe(4 * 60 * 60 * 1000);
  });

  test("uses explicit start and end, normalized to ISO", async () => {
    const { context } = createMockContext();

    await query.call(
      context,
      {
        input: ["30"],
        limit: 10,
        json: true,
        start: "2024-01-01T00:00:00Z",
        end: "2024-01-02T00:00:00Z",
      },
      deps,
    );

    const args = getLastQueryArgsOrThrow();
    expect(args.variables.params.startTime).toBe("2024-01-01T00:00:00.000Z");
    expect(args.variables.params.endTime).toBe("2024-01-02T00:00:00.000Z");
  });

  test("honors a lone --start (fills end=now)", async () => {
    const { context } = createMockContext();

    await query.call(
      context,
      {
        input: ["30"],
        limit: 10,
        json: true,
        start: "2024-01-01T00:00:00Z",
      },
      deps,
    );

    const args = getLastQueryArgsOrThrow();
    expect(args.variables.params.startTime).toBe("2024-01-01T00:00:00.000Z");
    const start = new Date(args.variables.params.startTime as string).getTime();
    const end = new Date(args.variables.params.endTime as string).getTime();
    expect(end).toBeGreaterThan(start);
  });

  test("errors when --interval is combined with --start/--end", async () => {
    const { context, stderr, getExitCode } = createMockContext();

    try {
      await query.call(
        context,
        {
          input: ["30"],
          limit: 10,
          json: true,
          interval: "4h",
          start: "2024-01-01T00:00:00Z",
          end: "2024-01-02T00:00:00Z",
        },
        deps,
      );
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }

    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Use either --interval or --start/--end");
  });

  test("writes column-major rows as JSON array when --json is set", async () => {
    const { context, stdout } = createMockContext();

    await query.call(
      context,
      {
        input: ["30"],
        limit: 10,
        json: true,
      },
      deps,
    );

    const printed = stripAnsi(stdout.join(""));
    const arrayStart = printed.indexOf("[");
    expect(arrayStart).not.toBe(-1);
    const rows = JSON.parse(printed.slice(arrayStart)) as unknown[];
    expect(rows).toEqual([{ msg: "hello" }]);
  });

  test("exits when task results contain errors", async () => {
    datasetQueryOutputFn.mockImplementationOnce(
      () =>
        Promise.resolve([
          {
            __typename: "TaskResult" as const,
            queryId: "q1",
            stageId: "main",
            resultKind: "ResultKindSchema" as const,
            resultSchema: null,
            paginatedResults: null,
            errors: [
              {
                __typename: "QueryError" as const,
                message: "invalid OPAL pipeline",
                text: "invalid OPAL pipeline",
              },
            ],
          },
        ]) as unknown as ReturnType<typeof datasetQueryOutputFn>,
    );

    const { context, stderr, getExitCode } = createMockContext();

    try {
      await query.call(
        context,
        {
          input: ["30"],
          limit: 10,
          json: true,
        },
        deps,
      );
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }

    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Query failed: invalid OPAL pipeline");
  });

  test("exits when query returns no schema", async () => {
    datasetQueryOutputFn.mockImplementationOnce(() =>
      Promise.resolve([
        {
          __typename: "TaskResult" as const,
          queryId: "q1",
          stageId: "main",
          resultKind: "ResultKindData" as const,
          resultSchema: null,
          paginatedResults: {
            numRows: 1,
            offset: 0,
            totalRows: 1,
            columns: [["hello"]],
          },
          errors: null,
        },
      ]),
    );

    const { context, stderr, getExitCode } = createMockContext();

    try {
      await query.call(
        context,
        {
          input: ["30"],
          limit: 10,
          json: true,
        },
        deps,
      );
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }

    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Query failed: No schema returned");
  });

  test("exits when query returns no data results", async () => {
    datasetQueryOutputFn.mockImplementationOnce(() =>
      Promise.resolve([
        {
          __typename: "TaskResult" as const,
          queryId: "q1",
          stageId: "main",
          resultKind: "ResultKindSchema" as const,
          resultSchema: {
            __typename: "TaskResultSchema" as const,
            fieldList: [],
          },
          paginatedResults: null,
          errors: null,
        },
      ]),
    );

    const { context, stderr, getExitCode } = createMockContext();

    try {
      await query.call(
        context,
        {
          input: ["30"],
          limit: 10,
          json: true,
        },
        deps,
      );
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }

    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Query failed: No results");
  });

  test("uses schema result without resultSchema when data result has no schema", async () => {
    datasetQueryOutputFn.mockImplementationOnce(
      () =>
        Promise.resolve([
          {
            __typename: "TaskResult" as const,
            queryId: "q1",
            stageId: "main",
            resultKind: "ResultKindSchema" as const,
            resultSchema: null,
            paginatedResults: null,
            errors: null,
          },
          {
            __typename: "TaskResult" as const,
            queryId: "q1",
            stageId: "main",
            resultKind: "ResultKindData" as const,
            resultSchema: null,
            paginatedResults: {
              numRows: 1,
              offset: 0,
              totalRows: 1,
              columns: [["hello"]],
            },
            errors: null,
          },
        ]) as unknown as ReturnType<typeof datasetQueryOutputFn>,
    );

    const { context, stdout } = createMockContext();

    await query.call(
      context,
      {
        input: ["30"],
        limit: 10,
        json: true,
      },
      deps,
    );

    const printed = stripAnsi(stdout.join(""));
    const arrayStart = printed.indexOf("[");
    expect(arrayStart).not.toBe(-1);
    const rows = JSON.parse(printed.slice(arrayStart)) as unknown[];
    expect(rows).toEqual([{}]);
  });
});
