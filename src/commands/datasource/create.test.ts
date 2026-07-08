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
const getConnectionModulePath = resolve(
  repoRoot,
  "src/gql/connection/get-connection.ts",
);
const createDatasourceModulePath = resolve(
  repoRoot,
  "src/gql/connection/create-datasource.ts",
);

const AWS_MODULE_ID = "observeinc/connection/aws";

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

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

let lastCreateArgs: unknown;
const createDatasourceFn = mock((_config: unknown, variables: unknown) => {
  lastCreateArgs = variables;
  return Promise.resolve({
    id: "ds-new",
    name: "created",
    type: "Filedrop",
    datastreamTokenID: "tok-1",
    config: null,
  });
});

let createDatasourceCmd: (typeof import("./create"))["createDatasourceCmd"];

const deps = {
  loadConfig: loadConfigFn,
} as Parameters<(typeof import("./create"))["createDatasourceCmd"]>[1];

suppressAnsiColor();

beforeAll(async () => {
  void mock.module(getConnectionModulePath, () => ({
    getConnection: getConnectionFn,
  }));
  void mock.module(createDatasourceModulePath, () => ({
    createDatasource: createDatasourceFn,
  }));

  const mod = await import("./create.ts");
  createDatasourceCmd = mod.createDatasourceCmd;
});

afterAll(() => {
  mock.restore();
});

describe("datasource create", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    getConnectionFn.mockClear();
    createDatasourceFn.mockClear();
    lastCreateArgs = undefined;
    connectionModuleId = "observeinc/connection/other";
  });

  test("creates a datasource on a non-AWS connection and forwards the input", async () => {
    const { context, stdout } = createMockContext();
    await createDatasourceCmd.call(
      context,
      {
        name: "my-ds",
        connectionId: "conn-1",
        datastreamId: "dsm-1",
        collectLogs: true,
      },
      deps,
    );

    expect(createDatasourceFn).toHaveBeenCalledTimes(1);
    expect(lastCreateArgs).toMatchObject({
      input: {
        name: "my-ds",
        dataConnectionID: "conn-1",
        datastreamID: "dsm-1",
        variables: [{ name: "collect_logs", value: "true" }],
      },
    });
    const output = JSON.parse(stdout.join(""));
    expect(output.id).toBe("ds-new");
  });

  test("requires --name for non-AWS connections", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await createDatasourceCmd.call(
        context,
        { connectionId: "conn-1", datastreamId: "dsm-1" },
        deps,
      );
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("--name is required");
    expect(createDatasourceFn).not.toHaveBeenCalled();
  });

  test("auto-derives the datasource name for AWS filedrop when --name is omitted", async () => {
    connectionModuleId = AWS_MODULE_ID;
    const { context } = createMockContext();
    await createDatasourceCmd.call(
      context,
      { connectionId: "conn-1", datastreamId: "dsm-1", type: "filedrop" },
      deps,
    );

    expect(lastCreateArgs).toMatchObject({
      input: { name: "aws-prod-filedrop" },
    });
  });

  test("rejects a mismatched --name for AWS datasources", async () => {
    connectionModuleId = AWS_MODULE_ID;
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await createDatasourceCmd.call(
        context,
        {
          name: "wrong-name",
          connectionId: "conn-1",
          datastreamId: "dsm-1",
          type: "filedrop",
        },
        deps,
      );
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("aws-prod-filedrop");
    expect(createDatasourceFn).not.toHaveBeenCalled();
  });

  test("rejects malformed --variables before calling the API", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await createDatasourceCmd.call(
        context,
        {
          name: "my-ds",
          connectionId: "conn-1",
          datastreamId: "dsm-1",
          variables: "not-a-pair",
        },
        deps,
      );
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("--variables");
    expect(createDatasourceFn).not.toHaveBeenCalled();
  });

  test("exits with code 1 and API Error prefix on GqlApiError", async () => {
    createDatasourceFn.mockImplementationOnce(() => {
      throw new GqlApiError("bad request", 400);
    });
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await createDatasourceCmd.call(
        context,
        { name: "my-ds", connectionId: "conn-1", datastreamId: "dsm-1" },
        deps,
      );
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("API Error (400)");
  });
});
