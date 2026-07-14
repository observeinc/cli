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
  "src/gql/datastream/create-datastream.ts",
);

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

const createDatastreamFn = mock((_config: unknown, _variables: unknown) =>
  Promise.resolve({
    id: "ds-123",
    name: "Kubernetes Explorer/OpenTelemetry Logs",
    description: null,
    disabled: false,
    directWrite: {
      otelLogs: { datasetId: "dataset-456" },
      prometheus: null,
      otelMetrics: null,
      k8sEntity: null,
      otelTrace: null,
    },
  }),
);

let create: (typeof import("./create"))["create"];

const deps = {
  loadConfig: loadConfigFn,
} as Parameters<(typeof import("./create"))["create"]>[1];

suppressAnsiColor();

beforeAll(async () => {
  void mock.module(gqlModulePath, () => ({
    createDatastream: createDatastreamFn,
  }));

  const mod = await import("./create.ts");
  create = mod.create;
});

afterAll(() => {
  mock.restore();
});

describe("datastream create", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    createDatastreamFn.mockClear();
  });

  test("calls createDatastream with correct variables for direct write otel logs", async () => {
    const { context, stdout } = createMockContext();
    await create.call(
      context,
      {
        name: "Kubernetes Explorer/OpenTelemetry Logs",
        directWriteOtelLogs: true,
      },
      deps,
    );

    expect(createDatastreamFn).toHaveBeenCalledTimes(1);
    const [, variables] = createDatastreamFn.mock.calls[0]!;
    expect(variables).toMatchObject({
      datastream: {
        name: "Kubernetes Explorer/OpenTelemetry Logs",
        directWrite: {
          otelLogs: true,
          prometheus: false,
          otelMetrics: false,
          k8sEntity: false,
          otelTrace: false,
        },
      },
    });

    const output = JSON.parse(stdout.join(""));
    expect(output.id).toBe("ds-123");
    expect(output.directWrite.otelLogs.datasetId).toBe("dataset-456");
  });

  test("omits directWrite when no direct write flags are set", async () => {
    const { context } = createMockContext();
    await create.call(
      context,
      {
        name: "plain-stream",
      },
      deps,
    );

    const [, variables] = createDatastreamFn.mock.calls[0]!;
    expect(variables).toMatchObject({
      datastream: {
        name: "plain-stream",
      },
    });
    expect(
      (variables as { datastream: Record<string, unknown> }).datastream
        .directWrite,
    ).toBeUndefined();
  });

  test("exits with code 1 on API error", async () => {
    createDatastreamFn.mockImplementationOnce(() => {
      const err = new Error("Permission denied");
      err.name = "GqlApiError";
      (err as unknown as { statusCode: number }).statusCode = 403;
      throw err;
    });

    const { context, stderr, getExitCode } = createMockContext();
    try {
      await create.call(context, { name: "fail-stream" }, deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });
});
