import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import type { LocalContext } from "../../context";
import type { Config } from "../../lib/config";
import {
  type ApmEnvironmentEntry,
  type ApmEnvironmentsListResponse,
  ListApmEnvironmentsOrderByParameter,
} from "../../rest/generated";
import { createWriter } from "../../lib/writer";

const loadConfigFn = mock(
  (): Config => ({
    customerId: "test-customer",
    token: "test-token",
    domain: "observeinc.com",
  }),
);

function entryStub(
  overrides: Partial<ApmEnvironmentEntry> = {},
): ApmEnvironmentEntry {
  return {
    environment: "prod",
    serviceNamespaces: ["shop", "payments"],
    truncated: false,
    ...overrides,
  };
}

function responseStub(
  environments: ApmEnvironmentEntry[] = [entryStub()],
): ApmEnvironmentsListResponse {
  return {
    interval: {
      startTime: "2026-07-03T00:00:00.000Z",
      endTime: "2026-07-03T01:00:00.000Z",
    },
    environments,
    meta: { totalCount: environments.length, limit: 100, offset: 0 },
  };
}

const listApmEnvironmentsFn = mock(
  (_params: object): Promise<ApmEnvironmentsListResponse> =>
    Promise.resolve(responseStub()),
);

const deps = {
  loadConfig: loadConfigFn,
  listApmEnvironments: listApmEnvironmentsFn,
} as Parameters<(typeof import("./environments"))["environments"]>[1];

let environments: (typeof import("./environments"))["environments"];
let previousNoColor: string | undefined;
let previousForceColor: string | undefined;

beforeAll(async () => {
  previousNoColor = process.env.NO_COLOR;
  previousForceColor = process.env.FORCE_COLOR;
  process.env.NO_COLOR = "1";
  process.env.FORCE_COLOR = "0";
  environments = (await import("./environments.ts")).environments;
});

afterAll(() => {
  mock.restore();
  if (previousNoColor === undefined) delete process.env.NO_COLOR;
  else process.env.NO_COLOR = previousNoColor;
  if (previousForceColor === undefined) delete process.env.FORCE_COLOR;
  else process.env.FORCE_COLOR = previousForceColor;
});

function createMockContext() {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const processMock = {
    exitCode: undefined as number | undefined,
    stdout: { write: (m: string) => (stdout.push(m), true) },
    stderr: { write: (m: string) => (stderr.push(m), true) },
  };
  const context = {
    process: processMock,
    writer: createWriter({ process: processMock }),
  } as unknown as LocalContext;
  return { context, stdout, stderr, getExitCode: () => processMock.exitCode };
}

describe("apm environments", () => {
  beforeEach(() => {
    listApmEnvironmentsFn.mockClear();
    loadConfigFn.mockClear();
  });

  test("forwards environment filter and sort", async () => {
    const { context } = createMockContext();
    await environments.call(
      context,
      {
        environment: "prod",
        sort: ListApmEnvironmentsOrderByParameter.Environment2,
        json: true,
      },
      deps,
    );
    const arg = listApmEnvironmentsFn.mock.calls[0]![0] as Record<
      string,
      unknown
    >;
    expect(arg).toMatchObject({ environment: "prod", orderBy: "-environment" });
  });

  test("--json prints the full envelope (interval + environments + meta)", async () => {
    const { context, stdout } = createMockContext();
    await environments.call(context, { json: true }, deps);
    const parsed = JSON.parse(stdout.join(""));
    expect(parsed).toHaveProperty("interval");
    expect(parsed).toHaveProperty("meta");
    expect(Array.isArray(parsed.environments)).toBe(true);
    expect(parsed.environments[0].environment).toBe("prod");
  });

  test("--format csv renders the environment rows", async () => {
    const { context, stdout } = createMockContext();
    await environments.call(context, { format: "csv" }, deps);
    const out = stdout.join("");
    expect(out).toContain("environment");
    expect(out).toContain("prod");
  });

  test("--fields selects columns, including a non-default field", async () => {
    const { context, stdout } = createMockContext();
    await environments.call(
      context,
      { fields: ["environment", "truncated"] },
      deps,
    );
    const out = stdout.join("");
    expect(out).toContain("ENVIRONMENT");
    expect(out).toContain("TRUNCATED");
    expect(out).not.toContain("SERVICE NAMESPACES");
  });

  test("table joins namespaces and marks truncation", async () => {
    listApmEnvironmentsFn.mockResolvedValueOnce(
      responseStub([
        entryStub({ serviceNamespaces: ["a", "b"], truncated: true }),
      ]),
    );
    const { context, stdout } = createMockContext();
    await environments.call(context, {}, deps);
    const out = stdout.join("");
    expect(out).toContain("a, b");
    expect(out).toContain("(truncated)");
  });

  test("empty result warns", async () => {
    listApmEnvironmentsFn.mockResolvedValueOnce(responseStub([]));
    const { context, stdout } = createMockContext();
    await environments.call(context, {}, deps);
    expect(stdout.join("")).toContain("No APM environments found.");
  });

  test("API error exits 1", async () => {
    listApmEnvironmentsFn.mockRejectedValueOnce(new Error("nope"));
    const { context, stderr, getExitCode } = createMockContext();
    await environments.call(context, {}, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("nope");
  });
});
