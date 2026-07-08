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
import { GqlApiError } from "../../../gql/gql-request";

const repoRoot = resolve(import.meta.dir, "../../../..");
const createConnectionModulePath = resolve(
  repoRoot,
  "src/gql/connection/create-connection.ts",
);
const listModuleVersionsModulePath = resolve(
  repoRoot,
  "src/gql/connection/list-module-versions.ts",
);

const AWS_MODULE_ID = "observeinc/connection/aws";

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

let lastCreateArgs: unknown;
const createConnectionFn = mock((_config: unknown, variables: unknown) => {
  lastCreateArgs = variables;
  return Promise.resolve({
    id: "conn-1",
    name: "my-aws",
    moduleID: AWS_MODULE_ID,
    version: "0.5.0",
  });
});

const listModuleVersionsFn = mock((_config: unknown, _variables: unknown) =>
  Promise.resolve(["0.4.0", "0.5.0"]),
);
let pickedVersion: string | undefined = "0.5.0";
const pickLatestStableVersionFn = mock((_all: unknown) => pickedVersion);

let createAwsConnectionCmd: (typeof import("./aws"))["createAwsConnectionCmd"];

const deps = {
  loadConfig: loadConfigFn,
} as Parameters<(typeof import("./aws"))["createAwsConnectionCmd"]>[1];

suppressAnsiColor();

beforeAll(async () => {
  void mock.module(createConnectionModulePath, () => ({
    createConnection: createConnectionFn,
  }));
  void mock.module(listModuleVersionsModulePath, () => ({
    listModuleVersions: listModuleVersionsFn,
    pickLatestStableVersion: pickLatestStableVersionFn,
  }));

  const mod = await import("./aws.ts");
  createAwsConnectionCmd = mod.createAwsConnectionCmd;
});

afterAll(() => {
  mock.restore();
});

describe("data-connection create aws", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    createConnectionFn.mockClear();
    listModuleVersionsFn.mockClear();
    pickLatestStableVersionFn.mockClear();
    lastCreateArgs = undefined;
    pickedVersion = "0.5.0";
  });

  test("creates the AWS connection with the pinned version and derived variables", async () => {
    const { context, stdout } = createMockContext();
    await createAwsConnectionCmd.call(
      context,
      {
        name: "my-aws",
        version: "0.5.0",
        accountRegion: "us-west-2",
        accountId: "123456789012",
      },
      deps,
    );

    // --version pinned → no version lookup.
    expect(listModuleVersionsFn).not.toHaveBeenCalled();
    expect(createConnectionFn).toHaveBeenCalledTimes(1);
    expect(lastCreateArgs).toMatchObject({
      input: {
        name: "my-aws",
        moduleID: AWS_MODULE_ID,
        version: "0.5.0",
      },
    });
    const vars = (
      lastCreateArgs as {
        input: { variables: { name: string; value: string }[] };
      }
    ).input.variables;
    // cluster_region and connection_name default from other flags.
    expect(vars).toContainEqual({ name: "account_region", value: "us-west-2" });
    expect(vars).toContainEqual({ name: "cluster_region", value: "us-west-2" });
    expect(vars).toContainEqual({ name: "account_id", value: "123456789012" });
    expect(vars).toContainEqual({ name: "connection_name", value: "my-aws" });

    const output = JSON.parse(stdout.join(""));
    expect(output.id).toBe("conn-1");
  });

  test("resolves the latest stable version when --version is omitted", async () => {
    pickedVersion = "0.5.0";
    const { context } = createMockContext();
    await createAwsConnectionCmd.call(
      context,
      { name: "my-aws", accountRegion: "us-west-2", accountId: "123456789012" },
      deps,
    );

    expect(listModuleVersionsFn).toHaveBeenCalledTimes(1);
    expect(pickLatestStableVersionFn).toHaveBeenCalledTimes(1);
    expect(lastCreateArgs).toMatchObject({ input: { version: "0.5.0" } });
  });

  test("errors when no stable version can be resolved", async () => {
    pickedVersion = undefined;
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await createAwsConnectionCmd.call(
        context,
        {
          name: "my-aws",
          accountRegion: "us-west-2",
          accountId: "123456789012",
        },
        deps,
      );
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("No published versions");
    expect(createConnectionFn).not.toHaveBeenCalled();
  });

  test("exits with code 1 and API Error prefix on GqlApiError", async () => {
    createConnectionFn.mockImplementationOnce(() => {
      throw new GqlApiError("forbidden", 403);
    });
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await createAwsConnectionCmd.call(
        context,
        {
          name: "my-aws",
          version: "0.5.0",
          accountRegion: "us-west-2",
          accountId: "123456789012",
        },
        deps,
      );
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("API Error (403)");
  });
});
