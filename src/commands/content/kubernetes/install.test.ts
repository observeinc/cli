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
  "src/gql/content/update-kubernetes-content.ts",
);

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

const updateKubernetesContentFn = mock(
  (_config: unknown, _variables: unknown) =>
    Promise.resolve({
      otelLogsDatasetId: "logs-ds-1",
      prometheusDatasetId: "prom-ds-2",
      entityDatasetId: "entity-ds-3",
      kubernetesLogsDatasetId: "k8s-logs-ds-4",
    }),
);

let install: (typeof import("./install"))["install"];

const deps = {
  loadConfig: loadConfigFn,
} as Parameters<(typeof import("./install"))["install"]>[1];

suppressAnsiColor();

beforeAll(async () => {
  void mock.module(gqlModulePath, () => ({
    updateKubernetesContent: updateKubernetesContentFn,
  }));

  const mod = await import("./install.ts");
  install = mod.install;
});

afterAll(() => {
  mock.restore();
});

describe("content kubernetes install", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    updateKubernetesContentFn.mockClear();
  });

  test("passes dataset IDs to updateKubernetesContent", async () => {
    const { context, stdout } = createMockContext();
    await install.call(
      context,
      {
        otelLogsDatasetId: "logs-ds-1",
        prometheusDatasetId: "prom-ds-2",
        entityDatasetId: "entity-ds-3",
      },
      deps,
    );

    expect(updateKubernetesContentFn).toHaveBeenCalledTimes(1);
    const [, variables] = updateKubernetesContentFn.mock.calls[0]!;
    expect(variables).toMatchObject({
      input: {
        otelLogsDatasetId: "logs-ds-1",
        prometheusDatasetId: "prom-ds-2",
        entityDatasetId: "entity-ds-3",
      },
    });

    const output = JSON.parse(stdout.join(""));
    expect(output.otelLogsDatasetId).toBe("logs-ds-1");
    expect(output.kubernetesLogsDatasetId).toBe("k8s-logs-ds-4");
  });

  test("passes rematerializationAction when provided", async () => {
    const { context } = createMockContext();
    await install.call(
      context,
      {
        otelLogsDatasetId: "logs-ds-1",
        rematerializationAction: "IgnoreRematerialization",
      },
      deps,
    );

    const [, variables] = updateKubernetesContentFn.mock.calls[0]!;
    expect(variables).toMatchObject({
      rematerializationAction: "IgnoreRematerialization",
    });
  });

  test("works with no dataset IDs (empty input)", async () => {
    const { context } = createMockContext();
    await install.call(context, {}, deps);

    expect(updateKubernetesContentFn).toHaveBeenCalledTimes(1);
    const [, variables] = updateKubernetesContentFn.mock.calls[0]!;
    expect(variables).toMatchObject({
      input: {},
    });
  });
});
