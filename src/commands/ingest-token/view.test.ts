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
  "src/gql/ingest-token/view-ingest-token.ts",
);

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

const viewIngestTokenFn = mock((_config: unknown, _variables: unknown) =>
  Promise.resolve({
    id: "token-123",
    name: "K8s Explorer - minikube",
    description: "Ingest token for K8s",
    disabled: false,
  }),
);

let view: (typeof import("./view"))["view"];

const deps = {
  loadConfig: loadConfigFn,
} as Parameters<(typeof import("./view"))["view"]>[2];

suppressAnsiColor();

beforeAll(async () => {
  void mock.module(gqlModulePath, () => ({
    viewIngestToken: viewIngestTokenFn,
  }));

  const mod = await import("./view.ts");
  view = mod.view;
});

afterAll(() => {
  mock.restore();
});

describe("ingest-token view", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    viewIngestTokenFn.mockClear();
  });

  test("calls viewIngestToken with correct id and outputs result", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, {}, "token-123", deps);

    expect(viewIngestTokenFn).toHaveBeenCalledTimes(1);
    const [, variables] = viewIngestTokenFn.mock.calls[0]!;
    expect(variables).toMatchObject({ id: "token-123" });

    const output = JSON.parse(stdout.join(""));
    expect(output.id).toBe("token-123");
    expect(output.name).toBe("K8s Explorer - minikube");
  });

  test("outputs token description and disabled status", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, {}, "token-123", deps);

    const output = JSON.parse(stdout.join(""));
    expect(output.description).toBe("Ingest token for K8s");
    expect(output.disabled).toBe(false);
  });

  test("exits with code 1 on API error", async () => {
    viewIngestTokenFn.mockImplementationOnce(() => {
      const err = new Error("Not found");
      err.name = "GqlApiError";
      (err as unknown as { statusCode: number }).statusCode = 404;
      throw err;
    });

    const { context, stderr, getExitCode } = createMockContext();
    await view.call(context, {}, "bad-id", deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });
});
