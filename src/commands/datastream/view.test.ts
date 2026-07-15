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
  "src/gql/datastream/view-datastream.ts",
);

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

const viewDatastreamFn = mock((_config: unknown, _variables: unknown) =>
  Promise.resolve({
    id: "ds-123",
    name: "Kubernetes Explorer/Prometheus",
    description: "Test datastream",
    disabled: false,
    directWrite: {
      prometheus: { datasetId: "dataset-789" },
      otelLogs: null,
      otelMetrics: null,
      k8sEntity: null,
      otelTrace: null,
    },
    stats: {
      firstIngest: "2026-05-01T00:00:00Z",
      lastIngest: "2026-05-06T00:00:00Z",
      totalObservations: "1000",
      totalVolumeBytes: "50000",
    },
  }),
);

let view: (typeof import("./view"))["view"];

const deps = {
  loadConfig: loadConfigFn,
} as Parameters<(typeof import("./view"))["view"]>[2];

suppressAnsiColor();

beforeAll(async () => {
  void mock.module(gqlModulePath, () => ({
    viewDatastream: viewDatastreamFn,
  }));

  const mod = await import("./view.ts");
  view = mod.view;
});

afterAll(() => {
  mock.restore();
});

describe("datastream view", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    viewDatastreamFn.mockClear();
  });

  test("calls viewDatastream with correct id and outputs result", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, {}, "ds-123", deps);

    expect(viewDatastreamFn).toHaveBeenCalledTimes(1);
    const [, variables] = viewDatastreamFn.mock.calls[0]!;
    expect(variables).toMatchObject({ id: "ds-123" });

    const output = JSON.parse(stdout.join(""));
    expect(output.id).toBe("ds-123");
    expect(output.name).toBe("Kubernetes Explorer/Prometheus");
    expect(output.stats.totalObservations).toBe("1000");
  });

  test("outputs directWrite configuration", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, {}, "ds-123", deps);

    const output = JSON.parse(stdout.join(""));
    expect(output.directWrite.prometheus.datasetId).toBe("dataset-789");
    expect(output.directWrite.otelLogs).toBeNull();
  });

  test("exits with code 1 on API error", async () => {
    viewDatastreamFn.mockImplementationOnce(() => {
      const err = new Error("Not found");
      err.name = "GqlApiError";
      (err as unknown as { statusCode: number }).statusCode = 404;
      throw err;
    });

    const { context, stderr, getExitCode } = createMockContext();
    await view.call(context, {}, "ds-bad", deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });
});
