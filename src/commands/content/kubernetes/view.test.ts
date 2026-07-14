import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../../test-helpers";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dir, "../../../..");
const gqlModulePath = resolve(
  repoRoot,
  "src/gql/content/view-kubernetes-content.ts",
);

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

const getKubernetesContentFn = mock((_config: unknown) =>
  Promise.resolve({
    otelLogsDatasetId: "ds-logs-1",
    prometheusDatasetId: "ds-prom-1",
    entityDatasetId: "ds-entity-1",
    kubernetesLogsDatasetId: "ds-klogs-1",
  }),
);

let view: (typeof import("./view"))["view"];

const deps = {
  loadConfig: loadConfigFn,
} as Parameters<(typeof import("./view"))["view"]>[0];

suppressAnsiColor();

beforeAll(async () => {
  void mock.module(gqlModulePath, () => ({
    getKubernetesContent: getKubernetesContentFn,
  }));

  const mod = await import("./view.ts");
  view = mod.view;
});

afterAll(() => {
  mock.restore();
});

describe("content kubernetes view", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    getKubernetesContentFn.mockClear();
  });

  test("outputs kubernetes content dataset IDs", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, deps);

    expect(getKubernetesContentFn).toHaveBeenCalledTimes(1);
    const output = JSON.parse(stdout.join(""));
    expect(output.otelLogsDatasetId).toBe("ds-logs-1");
    expect(output.prometheusDatasetId).toBe("ds-prom-1");
    expect(output.entityDatasetId).toBe("ds-entity-1");
  });

  test("outputs null when no content is installed", async () => {
    getKubernetesContentFn.mockImplementationOnce(
      () => Promise.resolve(null) as never,
    );

    const { context, stdout } = createMockContext();
    await view.call(context, deps);

    const output = JSON.parse(stdout.join(""));
    expect(output).toBeNull();
  });

  test("exits with code 1 on API error", async () => {
    getKubernetesContentFn.mockImplementationOnce(() => {
      const err = new Error("Unauthorized");
      err.name = "GqlApiError";
      (err as unknown as { statusCode: number }).statusCode = 401;
      throw err;
    });

    const { context, stderr, getExitCode } = createMockContext();
    try {
      await view.call(context, deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });
});
