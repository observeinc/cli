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
import { GqlApiError } from "../../gql/gql-request";

const repoRoot = resolve(import.meta.dir, "../../..");
const getDatasourceModulePath = resolve(
  repoRoot,
  "src/gql/connection/get-datasource.ts",
);
const getConnectionModulePath = resolve(
  repoRoot,
  "src/gql/connection/get-connection.ts",
);
const updateDatasourceModulePath = resolve(
  repoRoot,
  "src/gql/connection/update-datasource.ts",
);

const AWS_MODULE_ID = "observeinc/connection/aws";

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

// Existing datasource returned by getDatasource; mutated per test.
let existingDatasource: Record<string, unknown>;
const getDatasourceFn = mock((_config: unknown, _variables: unknown) =>
  Promise.resolve(existingDatasource),
);

let connectionModuleId = "observeinc/connection/other";
const getConnectionFn = mock((_config: unknown, _variables: unknown) =>
  Promise.resolve({
    id: "conn-1",
    name: "aws-prod",
    moduleID: connectionModuleId,
    variables: [],
    datasources: [],
  }),
);

let lastUpdateArgs: unknown;
const updateDatasourceFn = mock((_config: unknown, variables: unknown) => {
  lastUpdateArgs = variables;
  return Promise.resolve({
    id: "ds-1",
    name: "ds-old",
    type: "Filedrop",
    datastreamTokenID: "tok-1",
    config: null,
  });
});

function baseExisting(): Record<string, unknown> {
  return {
    id: "ds-1",
    name: "ds-old",
    dataConnectionID: "conn-1",
    datastreamID: "dsm-1",
    type: "Filedrop",
    variables: [{ name: "collect_logs", value: "false" }],
    clientStackAttributes: [],
    config: null,
  };
}

let updateDatasourceCmd: (typeof import("./update"))["updateDatasourceCmd"];

const deps = {
  loadConfig: loadConfigFn,
} as Parameters<(typeof import("./update"))["updateDatasourceCmd"]>[2];

suppressAnsiColor();

beforeAll(async () => {
  void mock.module(getDatasourceModulePath, () => ({
    getDatasource: getDatasourceFn,
  }));
  void mock.module(getConnectionModulePath, () => ({
    getConnection: getConnectionFn,
  }));
  void mock.module(updateDatasourceModulePath, () => ({
    updateDatasource: updateDatasourceFn,
  }));

  const mod = await import("./update.ts");
  updateDatasourceCmd = mod.updateDatasourceCmd;
});

afterAll(() => {
  mock.restore();
});

describe("datasource update", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    getDatasourceFn.mockClear();
    getConnectionFn.mockClear();
    updateDatasourceFn.mockClear();
    lastUpdateArgs = undefined;
    connectionModuleId = "observeinc/connection/other";
    existingDatasource = baseExisting();
  });

  test("merges existing variables with flags and preserves untouched fields", async () => {
    const { context, stdout } = createMockContext();
    await updateDatasourceCmd.call(
      context,
      { variables: "foo=bar", collectLogs: true },
      "ds-1",
      deps,
    );

    expect(updateDatasourceFn).toHaveBeenCalledTimes(1);
    expect(lastUpdateArgs).toMatchObject({
      id: "ds-1",
      input: {
        name: "ds-old",
        dataConnectionID: "conn-1",
        datastreamID: "dsm-1",
      },
    });
    // collect_logs starts "false", is overridden to "true"; foo=bar is added.
    const vars = (
      lastUpdateArgs as {
        input: { variables: { name: string; value: string }[] };
      }
    ).input.variables;
    expect(vars).toContainEqual({ name: "collect_logs", value: "true" });
    expect(vars).toContainEqual({ name: "foo", value: "bar" });

    const output = JSON.parse(stdout.join(""));
    expect(output.id).toBe("ds-1");
  });

  test("rejects an AWS rename that breaks the naming convention", async () => {
    connectionModuleId = AWS_MODULE_ID;
    const { context, stderr, getExitCode } = createMockContext();
    await updateDatasourceCmd.call(context, { name: "renamed" }, "ds-1", deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("aws-prod-filedrop");
    expect(updateDatasourceFn).not.toHaveBeenCalled();
  });

  // Poller config the input can't round-trip -> refuse rather than silently drop it.
  test("refuses to update a datasource with poller config the CLI cannot represent", async () => {
    existingDatasource = {
      ...baseExisting(),
      config: {
        awsMetricsPollerConfig: {
          // poller.config without a `queries` discriminator → unsupported.
          poller: { config: {} },
        },
      },
    };
    const { context, stderr, getExitCode } = createMockContext();
    await updateDatasourceCmd.call(context, {}, "ds-1", deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Contact Observe support");
    expect(updateDatasourceFn).not.toHaveBeenCalled();
  });

  test("exits with code 1 and API Error prefix on GqlApiError", async () => {
    updateDatasourceFn.mockImplementationOnce(() => {
      throw new GqlApiError("conflict", 409);
    });
    const { context, stderr, getExitCode } = createMockContext();
    await updateDatasourceCmd.call(context, {}, "ds-1", deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("API Error (409)");
  });
});
