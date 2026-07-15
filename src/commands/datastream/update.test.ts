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

const repoRoot = resolve(import.meta.dir, "../../..");
const gqlModulePath = resolve(
  repoRoot,
  "src/gql/datastream/update-datastream.ts",
);

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

const updateDatastreamFn = mock((_config: unknown, _variables: unknown) =>
  Promise.resolve({
    id: "ds-123",
    name: "Updated Name",
    description: "Updated desc",
    disabled: false,
    directWrite: null,
  }),
);

const viewDatastreamFn = mock((_config: unknown, _variables: unknown) =>
  Promise.resolve({
    id: "ds-123",
    name: "Existing Name",
    description: "Existing desc",
    disabled: false,
    directWrite: null,
    stats: null,
  }),
);

let update: (typeof import("./update"))["update"];

const deps = {
  loadConfig: loadConfigFn,
  viewDatastream: viewDatastreamFn,
} as Parameters<(typeof import("./update"))["update"]>[2];

suppressAnsiColor();

beforeAll(async () => {
  void mock.module(gqlModulePath, () => ({
    updateDatastream: updateDatastreamFn,
  }));

  const mod = await import("./update.ts");
  update = mod.update;
});

afterAll(() => {
  mock.restore();
});

describe("datastream update", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    updateDatastreamFn.mockClear();
    viewDatastreamFn.mockClear();
  });

  test("passes provided name without fetching current datastream", async () => {
    const { context, stdout } = createMockContext();
    await update.call(context, { name: "Updated Name" }, "ds-123", deps);

    expect(viewDatastreamFn).not.toHaveBeenCalled();
    expect(updateDatastreamFn).toHaveBeenCalledTimes(1);
    const [, variables] = updateDatastreamFn.mock.calls[0]!;
    expect(variables).toMatchObject({
      id: "ds-123",
      datastream: { name: "Updated Name" },
    });

    const output = JSON.parse(stdout.join(""));
    expect(output.id).toBe("ds-123");
  });

  test("backfills current name when --name is omitted", async () => {
    const { context } = createMockContext();
    await update.call(context, { description: "Only desc" }, "ds-123", deps);

    expect(viewDatastreamFn).toHaveBeenCalledTimes(1);
    const [, variables] = updateDatastreamFn.mock.calls[0]!;
    expect(variables).toMatchObject({
      id: "ds-123",
      datastream: { name: "Existing Name", description: "Only desc" },
    });
  });

  test("exits with code 1 when no editable field is provided", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    await update.call(context, {}, "ds-123", deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Nothing to update");
    expect(viewDatastreamFn).not.toHaveBeenCalled();
    expect(updateDatastreamFn).not.toHaveBeenCalled();
  });

  test("exits with code 1 on API error", async () => {
    updateDatastreamFn.mockImplementationOnce(() => {
      const err = new Error("Permission denied");
      err.name = "GqlApiError";
      (err as unknown as { statusCode: number }).statusCode = 403;
      throw err;
    });

    const { context, stderr, getExitCode } = createMockContext();
    await update.call(context, { name: "fail" }, "ds-123", deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });
});
