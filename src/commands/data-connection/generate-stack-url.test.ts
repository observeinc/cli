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
const getCloudInfoModulePath = resolve(
  repoRoot,
  "src/gql/customer/get-cloud-info.ts",
);

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc",
}));

// A connection with only a Filedrop datasource and an account_region variable.
function filedropConnection() {
  return {
    id: "conn-1",
    name: "aws-prod",
    moduleID: "observeinc/connection/aws",
    variables: [{ name: "account_region", value: "us-west-2" }],
    datasources: [
      {
        id: "ds-filedrop",
        type: "Filedrop",
        datastreamID: "dsm-1",
        config: {
          datasourceFiledropConfig: {
            dataAccessPointArn: "arn:aws:s3:us-west-2:123:accesspoint/ap",
            destinationUri: "s3://bucket/prefix",
          },
          awsCollectionStackConfig: {
            configResourceList: [],
            logGroupNamePatterns: [],
            excludeLogGroupNamePatterns: [],
            sourceBucketNames: [],
            awsServiceMetricsList: [],
            customMetricsList: [],
          },
        },
      },
    ],
  };
}

let connectionToReturn: ReturnType<typeof filedropConnection>;
let cloudInfoToReturn: { accountId?: string } | null;

const getConnectionFn = mock((_config: unknown, _variables: unknown) =>
  Promise.resolve(connectionToReturn),
);
const getCloudInfoFn = mock((_config: unknown) =>
  Promise.resolve(cloudInfoToReturn),
);

let generateStackUrlCmd: (typeof import("./generate-stack-url"))["generateStackUrlCmd"];

const deps = {
  loadConfig: loadConfigFn,
} as Parameters<
  (typeof import("./generate-stack-url"))["generateStackUrlCmd"]
>[2];

suppressAnsiColor();

beforeAll(async () => {
  void mock.module(getConnectionModulePath, () => ({
    getConnection: getConnectionFn,
  }));
  void mock.module(getCloudInfoModulePath, () => ({
    getCloudInfo: getCloudInfoFn,
  }));

  const mod = await import("./generate-stack-url.ts");
  generateStackUrlCmd = mod.generateStackUrlCmd;
});

afterAll(() => {
  mock.restore();
});

describe("data-connection generate-stack-url", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    getConnectionFn.mockClear();
    getCloudInfoFn.mockClear();
    connectionToReturn = filedropConnection();
    cloudInfoToReturn = { accountId: "999999999999" };
  });

  test("builds a CloudFormation URL for a filedrop-only connection", async () => {
    const { context, stdout } = createMockContext();
    await generateStackUrlCmd.call(context, {}, "conn-1", deps);

    const url = stdout.join("").trim();
    expect(url).toContain(
      "us-west-2.console.aws.amazon.com/cloudformation/home",
    );
    expect(url).toContain("region=us-west-2");
    expect(url).toContain("stackName=aws-prod");
    // Filedrop-only: no poller, so getCloudInfo is not consulted.
    expect(getCloudInfoFn).not.toHaveBeenCalled();
  });

  // Guard: stack name must equal the connection name (IAM role naming).
  test("rejects a --stack-name that does not match the connection name", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await generateStackUrlCmd.call(
        context,
        { stackName: "different" },
        "conn-1",
        deps,
      );
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("--stack-name must match");
  });

  test("errors when no region can be resolved", async () => {
    connectionToReturn = {
      ...filedropConnection(),
      variables: [],
    };
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await generateStackUrlCmd.call(context, {}, "conn-1", deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("account_region");
  });

  test("errors when the connection has no filedrop or poller datasource", async () => {
    connectionToReturn = { ...filedropConnection(), datasources: [] };
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await generateStackUrlCmd.call(context, {}, "conn-1", deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("no Filedrop or Poller datasource");
  });

  test("resolves the Observe AWS account id for poller datasources", async () => {
    connectionToReturn = {
      ...filedropConnection(),
      datasources: [
        {
          id: "ds-poller",
          type: "Poller",
          datastreamID: "dsm-poller",
          config: { datasourceFiledropConfig: null },
        } as unknown as ReturnType<
          typeof filedropConnection
        >["datasources"][number],
      ],
    };
    const { context, stdout } = createMockContext();
    await generateStackUrlCmd.call(context, {}, "conn-1", deps);

    expect(getCloudInfoFn).toHaveBeenCalledTimes(1);
    const url = stdout.join("").trim();
    expect(url).toContain("param_ObserveAwsAccountId=999999999999");
  });

  test("errors when poller present but Observe account id is unavailable", async () => {
    connectionToReturn = {
      ...filedropConnection(),
      datasources: [
        {
          id: "ds-poller",
          type: "Poller",
          datastreamID: "dsm-poller",
          config: { datasourceFiledropConfig: null },
        } as unknown as ReturnType<
          typeof filedropConnection
        >["datasources"][number],
      ],
    };
    cloudInfoToReturn = null;
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await generateStackUrlCmd.call(context, {}, "conn-1", deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Observe AWS account ID");
  });

  test("exits with code 1 and API Error prefix on GqlApiError", async () => {
    getConnectionFn.mockImplementationOnce(() => {
      throw new GqlApiError("boom", 500);
    });
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await generateStackUrlCmd.call(context, {}, "conn-1", deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("API Error (500)");
  });
});
