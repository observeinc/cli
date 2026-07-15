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
import { ResponseError } from "../../rest/generated/runtime";
import type { DatasetResource } from "../../rest/generated";

const repoRoot = resolve(import.meta.dir, "../../..");
const getDatasetModulePath = resolve(
  repoRoot,
  "src/rest/dataset/get-dataset.ts",
);

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

function datasetStub(): DatasetResource {
  return {
    id: "42",
    label: "Nginx Logs",
    description: "access logs",
    fieldList: [{ name: "status", type: { tag: "int64" } }],
    primaryKey: ["status"],
  } as unknown as DatasetResource;
}

let datasetToReturn: DatasetResource;
const getDatasetFn = mock((_args: { config: unknown; id: string }) =>
  Promise.resolve(datasetToReturn),
);

let view: (typeof import("./view"))["view"];

const deps = {
  loadConfig: loadConfigFn,
} as Parameters<(typeof import("./view"))["view"]>[2];

suppressAnsiColor();

beforeAll(async () => {
  void mock.module(getDatasetModulePath, () => ({
    getDataset: getDatasetFn,
  }));

  const mod = await import("./view.ts");
  view = mod.view;
});

afterAll(() => {
  mock.restore();
});

describe("dataset view", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    getDatasetFn.mockClear();
    datasetToReturn = datasetStub();
  });

  test("passes the dataset id and emits JSON with --json", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, { json: true }, "42", deps);

    expect(getDatasetFn).toHaveBeenCalledTimes(1);
    const [firstArgs] = getDatasetFn.mock.calls[0]!;
    expect(firstArgs).toMatchObject({ id: "42" });
    const payload = JSON.parse(stdout.join("")) as DatasetResource;
    expect(payload.id).toBe("42");
  });

  test("renders label and description by default", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, {}, "42", deps);
    const out = stdout.join("");
    expect(out).toContain("Nginx Logs");
    expect(out).toContain("access logs");
  });

  test("gives a friendly not-found message on a 404 and exits 1", async () => {
    getDatasetFn.mockImplementationOnce(() => {
      throw new ResponseError(
        new Response(null, { status: 404, statusText: "Not Found" }),
      );
    });
    const { context, stderr, getExitCode } = createMockContext();
    await view.call(context, {}, "missing", deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Dataset not found: missing");
  });

  test("exits with code 1 on a non-404 API error", async () => {
    getDatasetFn.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    const { context, stderr, getExitCode } = createMockContext();
    await view.call(context, {}, "42", deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });
});
