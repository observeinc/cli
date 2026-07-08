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
  "src/gql/ingest-token/update-ingest-token.ts",
);

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

const updateIngestTokenFn = mock((_config: unknown, _variables: unknown) =>
  Promise.resolve({
    id: "token-123",
    name: "Updated Token",
    description: "New description",
    disabled: false,
  }),
);

const viewIngestTokenFn = mock((_config: unknown, _variables: unknown) =>
  Promise.resolve({
    id: "token-123",
    name: "Existing Token",
    description: "Existing description",
    disabled: true,
  }),
);

let update: (typeof import("./update"))["update"];

const deps = {
  loadConfig: loadConfigFn,
  viewIngestToken: viewIngestTokenFn,
} as Parameters<(typeof import("./update"))["update"]>[2];

suppressAnsiColor();

beforeAll(async () => {
  void mock.module(gqlModulePath, () => ({
    updateIngestToken: updateIngestTokenFn,
  }));

  const mod = await import("./update.ts");
  update = mod.update;
});

afterAll(() => {
  mock.restore();
});

describe("ingest-token update", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    updateIngestTokenFn.mockClear();
    viewIngestTokenFn.mockClear();
  });

  test("passes id and name, backfilling current disabled state", async () => {
    const { context, stdout } = createMockContext();
    await update.call(context, { name: "Updated Token" }, "token-123", deps);

    expect(viewIngestTokenFn).toHaveBeenCalledTimes(1);
    expect(updateIngestTokenFn).toHaveBeenCalledTimes(1);
    const [, variables] = updateIngestTokenFn.mock.calls[0]!;
    expect(variables).toMatchObject({
      id: "token-123",
      input: { name: "Updated Token", disabled: true },
    });

    const output = JSON.parse(stdout.join(""));
    expect(output.id).toBe("token-123");
  });

  test("uses provided disabled flag without fetching current token", async () => {
    const { context } = createMockContext();
    await update.call(context, { disabled: false }, "token-123", deps);

    expect(viewIngestTokenFn).not.toHaveBeenCalled();
    const [, variables] = updateIngestTokenFn.mock.calls[0]!;
    expect((variables as { input: { disabled: boolean } }).input.disabled).toBe(
      false,
    );
  });

  test("only includes provided editable fields in input", async () => {
    const { context } = createMockContext();
    await update.call(
      context,
      { description: "Only desc", disabled: false },
      "token-123",
      deps,
    );

    const [, variables] = updateIngestTokenFn.mock.calls[0]!;
    const input = (variables as { input: Record<string, unknown> }).input;
    expect(input.description).toBe("Only desc");
    expect(input.name).toBeUndefined();
  });

  test("exits with code 1 when no editable field is provided", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await update.call(context, {}, "token-123", deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Nothing to update");
    expect(viewIngestTokenFn).not.toHaveBeenCalled();
    expect(updateIngestTokenFn).not.toHaveBeenCalled();
  });

  test("exits with code 1 on API error", async () => {
    updateIngestTokenFn.mockImplementationOnce(() => {
      const err = new Error("Forbidden");
      err.name = "GqlApiError";
      (err as unknown as { statusCode: number }).statusCode = 403;
      throw err;
    });

    const { context, stderr, getExitCode } = createMockContext();
    try {
      await update.call(context, { name: "fail" }, "token-123", deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });
});
