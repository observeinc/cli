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
  type ApmInvocationGraphResponse,
  type ApmInvocationParticipant,
  type ApmServiceInvocation,
  ApmServiceType,
} from "../../rest/generated";
import { createWriter } from "../../lib/writer";

const loadConfigFn = mock(
  (): Config => ({
    customerId: "test-customer",
    token: "test-token",
    domain: "observeinc.com",
  }),
);

function participant(
  overrides: Partial<ApmInvocationParticipant> = {},
): ApmInvocationParticipant {
  return {
    serviceName: "checkout",
    environment: "prod",
    serviceNamespace: null,
    type: null,
    language: null,
    ...overrides,
  };
}

function invocationStub(): ApmServiceInvocation {
  return {
    source: participant({ serviceName: "web" }),
    target: participant({
      serviceName: "checkout",
      type: ApmServiceType.Service,
    }),
    metrics: {
      interval: {
        startTime: "2026-07-03T00:00:00.000Z",
        endTime: "2026-07-03T01:00:00.000Z",
      },
      invocationRatePerSecond: 5,
      errorRatePerSecond: 0,
      durationP95Seconds: 0.1,
    },
  };
}

function responseStub(
  invocations: ApmServiceInvocation[] = [invocationStub()],
): ApmInvocationGraphResponse {
  return {
    interval: {
      startTime: "2026-07-03T00:00:00.000Z",
      endTime: "2026-07-03T01:00:00.000Z",
    },
    services: [participant() as never],
    invocations,
  };
}

const getApmInvocationGraphFn = mock(
  (_params: object): Promise<ApmInvocationGraphResponse> =>
    Promise.resolve(responseStub()),
);

const deps = {
  loadConfig: loadConfigFn,
  getApmInvocationGraph: getApmInvocationGraphFn,
} as Parameters<(typeof import("./invocation-graph"))["invocationGraph"]>[1];

let invocationGraph: (typeof import("./invocation-graph"))["invocationGraph"];
let previousNoColor: string | undefined;
let previousForceColor: string | undefined;

beforeAll(async () => {
  previousNoColor = process.env.NO_COLOR;
  previousForceColor = process.env.FORCE_COLOR;
  process.env.NO_COLOR = "1";
  process.env.FORCE_COLOR = "0";
  invocationGraph = (await import("./invocation-graph.ts")).invocationGraph;
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

describe("apm invocation-graph — mode guards", () => {
  beforeEach(() => {
    getApmInvocationGraphFn.mockClear();
  });

  test("--endpoint-name without --service-name is rejected", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    await invocationGraph.call(
      context,
      { endpointName: "GET /x", environment: "prod" },
      deps,
    );
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain(
      "--endpoint-name requires --service-name",
    );
    expect(getApmInvocationGraphFn).not.toHaveBeenCalled();
  });

  test("--direct-neighbors-only without --service-name is rejected", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    await invocationGraph.call(
      context,
      { directNeighborsOnly: true, environment: "prod" },
      deps,
    );
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain(
      "--direct-neighbors-only requires --service-name",
    );
    expect(getApmInvocationGraphFn).not.toHaveBeenCalled();
  });

  test("--service-name without --environment is rejected", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    await invocationGraph.call(context, { serviceName: "checkout" }, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("--environment is required");
    expect(getApmInvocationGraphFn).not.toHaveBeenCalled();
  });

  test("no --environment is rejected (required in every mode)", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    await invocationGraph.call(context, {}, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("--environment is required");
    expect(getApmInvocationGraphFn).not.toHaveBeenCalled();
  });
});

describe("apm invocation-graph — request & output", () => {
  beforeEach(() => {
    getApmInvocationGraphFn.mockClear();
  });

  test("forwards focal params and never sends limit/offset", async () => {
    const { context } = createMockContext();
    await invocationGraph.call(
      context,
      {
        serviceName: "checkout",
        environment: "prod",
        endpointName: "GET /cart",
        directNeighborsOnly: true,
        interval: "4h",
        json: true,
      },
      deps,
    );
    const arg = getApmInvocationGraphFn.mock.calls[0]![0] as Record<
      string,
      unknown
    >;
    expect(arg).toMatchObject({
      serviceName: "checkout",
      environment: "prod",
      endpointName: "GET /cart",
      directNeighborsOnly: true,
    });
    expect(arg.limit).toBeUndefined();
    expect(arg.offset).toBeUndefined();
    expect(typeof arg.startTime).toBe("string");
  });

  test("--json prints the full envelope (interval + services + invocations)", async () => {
    const { context, stdout } = createMockContext();
    await invocationGraph.call(
      context,
      { environment: "prod", json: true },
      deps,
    );
    const parsed = JSON.parse(stdout.join(""));
    expect(parsed).toHaveProperty("interval");
    expect(parsed).toHaveProperty("services");
    expect(Array.isArray(parsed.invocations)).toBe(true);
    expect(parsed.invocations[0].source.serviceName).toBe("web");
  });

  test("--environment alone scopes the environment-wide graph (no --service-name needed)", async () => {
    const { context } = createMockContext();
    await invocationGraph.call(
      context,
      { environment: "prod", json: true },
      deps,
    );
    expect(getApmInvocationGraphFn).toHaveBeenCalledTimes(1);
    const arg = getApmInvocationGraphFn.mock.calls[0]![0] as Record<
      string,
      unknown
    >;
    expect(arg.environment).toBe("prod");
    expect(arg.serviceName).toBeUndefined();
  });

  test("table renders nodes and the mode line", async () => {
    const { context, stdout } = createMockContext();
    await invocationGraph.call(
      context,
      {
        serviceName: "checkout",
        environment: "prod",
      },
      deps,
    );
    const out = stdout.join("");
    expect(out).toContain("web@prod");
    expect(out).toContain("checkout@prod");
    expect(out).toContain("mode: focal-service");
  });

  test("environment-wide mode with no edges warns", async () => {
    getApmInvocationGraphFn.mockResolvedValueOnce(responseStub([]));
    const { context, stdout } = createMockContext();
    await invocationGraph.call(context, { environment: "prod" }, deps);
    const out = stdout.join("");
    expect(out).toContain("mode: environment-wide (prod)");
    expect(out).toContain("No invocations found");
  });

  test("--format csv renders the invocation rows", async () => {
    const { context, stdout } = createMockContext();
    await invocationGraph.call(
      context,
      { environment: "prod", format: "csv" },
      deps,
    );
    const out = stdout.join("");
    expect(out).toContain("source");
    expect(out).toContain("web");
  });

  test("--fields selects a subset of columns", async () => {
    const { context, stdout } = createMockContext();
    await invocationGraph.call(
      context,
      { environment: "prod", fields: ["source", "target"] },
      deps,
    );
    const out = stdout.join("");
    expect(out).toContain("SOURCE");
    expect(out).toContain("TARGET");
    expect(out).not.toContain("INV/S");
  });
});
