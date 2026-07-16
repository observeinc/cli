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
  type ApmService,
  type ApmServicesListResponse,
  ListApmServicesOrderByParameter,
} from "../../rest/generated";
import { createWriter } from "../../lib/writer";

const loadConfigFn = mock(
  (): Config => ({
    customerId: "test-customer",
    token: "test-token",
    domain: "observeinc.com",
  }),
);

function serviceStub(overrides: Partial<ApmService> = {}): ApmService {
  return {
    serviceName: "checkout",
    environment: "prod",
    serviceNamespace: null,
    type: null,
    language: null,
    redMetrics: {
      interval: {
        startTime: "2026-07-03T00:00:00.000Z",
        endTime: "2026-07-03T01:00:00.000Z",
      },
      invocationRatePerSecond: 12.5,
      errorRatePerSecond: 0.1,
      durationP95Seconds: 0.234,
    },
    related: { correlationTags: {}, metrics: [] },
    ...overrides,
  };
}

function responseStub(
  services: ApmService[] = [serviceStub()],
  meta: Partial<ApmServicesListResponse["meta"]> = {},
): ApmServicesListResponse {
  return {
    interval: {
      startTime: "2026-07-03T00:00:00.000Z",
      endTime: "2026-07-03T01:00:00.000Z",
    },
    services,
    meta: { totalCount: services.length, limit: 100, offset: 0, ...meta },
  };
}

const listApmServicesFn = mock(
  (_params: object): Promise<ApmServicesListResponse> =>
    Promise.resolve(responseStub()),
);

const deps = {
  loadConfig: loadConfigFn,
  listApmServices: listApmServicesFn,
} as Parameters<(typeof import("./services"))["services"]>[1];

let services: (typeof import("./services"))["services"];
let previousNoColor: string | undefined;
let previousForceColor: string | undefined;

beforeAll(async () => {
  previousNoColor = process.env.NO_COLOR;
  previousForceColor = process.env.FORCE_COLOR;
  process.env.NO_COLOR = "1";
  process.env.FORCE_COLOR = "0";
  services = (await import("./services.ts")).services;
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

describe("apm services — request mapping", () => {
  beforeEach(() => {
    listApmServicesFn.mockClear();
    loadConfigFn.mockClear();
  });

  test("forwards filters, expand, pagination and sort", async () => {
    const { context } = createMockContext();
    await services.call(
      context,
      {
        serviceName: "checkout",
        environment: "prod",
        serviceNamespace: "shop",
        expand: true,
        limit: 5,
        offset: 10,
        sort: ListApmServicesOrderByParameter.DurationP95Seconds2,
        json: true,
      },
      deps,
    );

    expect(listApmServicesFn).toHaveBeenCalledTimes(1);
    const arg = listApmServicesFn.mock.calls[0]![0] as Record<string, unknown>;
    expect(arg).toMatchObject({
      serviceName: "checkout",
      environment: "prod",
      serviceNamespace: "shop",
      expand: true,
      limit: 5,
      offset: 10,
      orderBy: "-durationP95Seconds",
    });
  });

  test("--interval resolves to an ISO start/end window", async () => {
    const { context } = createMockContext();
    await services.call(context, { interval: "4h", json: true }, deps);
    const arg = listApmServicesFn.mock.calls[0]![0] as {
      startTime?: string;
      endTime?: string;
    };
    expect(typeof arg.startTime).toBe("string");
    expect(typeof arg.endTime).toBe("string");
    expect(Date.parse(arg.startTime!)).toBeLessThan(Date.parse(arg.endTime!));
    // ~4h window
    const deltaHours =
      (Date.parse(arg.endTime!) - Date.parse(arg.startTime!)) / 3_600_000;
    expect(deltaHours).toBeCloseTo(4, 1);
  });

  test("absolute --start/--end pass through (normalized to ISO)", async () => {
    const { context } = createMockContext();
    await services.call(
      context,
      {
        start: "2026-07-01T00:00:00Z",
        end: "2026-07-01T06:00:00Z",
        json: true,
      },
      deps,
    );
    const arg = listApmServicesFn.mock.calls[0]![0] as {
      startTime?: string;
      endTime?: string;
    };
    expect(arg.startTime).toBe("2026-07-01T00:00:00.000Z");
    expect(arg.endTime).toBe("2026-07-01T06:00:00.000Z");
  });

  test("--interval with absolute flags is rejected (exit 1)", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    await services.call(
      context,
      { interval: "4h", start: "2026-07-01T00:00:00Z" },
      deps,
    );
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Use either --interval or --start/--end");
    expect(listApmServicesFn).not.toHaveBeenCalled();
  });

  test("an invalid --start exits 1", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    await services.call(context, { start: "garbage" }, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("--start");
    expect(listApmServicesFn).not.toHaveBeenCalled();
  });
});

describe("apm services — output", () => {
  beforeEach(() => {
    listApmServicesFn.mockClear();
  });

  test("--json prints the full envelope (interval + services + meta)", async () => {
    const { context, stdout } = createMockContext();
    await services.call(context, { json: true }, deps);
    const parsed = JSON.parse(stdout.join(""));
    expect(parsed).toHaveProperty("interval");
    expect(parsed).toHaveProperty("meta");
    expect(Array.isArray(parsed.services)).toBe(true);
    expect(parsed.services[0].serviceName).toBe("checkout");
  });

  test("--format csv renders the service rows", async () => {
    const { context, stdout } = createMockContext();
    await services.call(context, { format: "csv" }, deps);
    const out = stdout.join("");
    expect(out).toContain("serviceName");
    expect(out).toContain("checkout");
  });

  test("--fields selects columns, including a non-default field", async () => {
    const { context, stdout } = createMockContext();
    await services.call(context, { fields: ["serviceName", "type"] }, deps);
    const out = stdout.join("");
    expect(out).toContain("SERVICE");
    expect(out).toContain("TYPE");
    expect(out).not.toContain("INV/S");
  });

  test("table output shows the service and formats null rates as -", async () => {
    listApmServicesFn.mockResolvedValueOnce(
      responseStub([
        serviceStub({
          serviceName: "cart",
          redMetrics: {
            interval: {
              startTime: "2026-07-03T00:00:00.000Z",
              endTime: "2026-07-03T01:00:00.000Z",
            },
            invocationRatePerSecond: null,
            errorRatePerSecond: null,
            durationP95Seconds: null,
          },
        }),
      ]),
    );
    const { context, stdout } = createMockContext();
    await services.call(context, {}, deps);
    const out = stdout.join("");
    expect(out).toContain("cart");
    expect(out).toContain("-");
  });

  test("empty result warns", async () => {
    listApmServicesFn.mockResolvedValueOnce(responseStub([]));
    const { context, stdout } = createMockContext();
    await services.call(context, {}, deps);
    expect(stdout.join("")).toContain("No APM services found.");
  });

  test("full page emits a pagination hint", async () => {
    listApmServicesFn.mockResolvedValueOnce(
      responseStub([serviceStub(), serviceStub({ serviceName: "cart" })], {
        limit: 2,
        offset: 0,
        totalCount: -1,
      }),
    );
    const { context, stdout } = createMockContext();
    await services.call(context, { limit: 2 }, deps);
    expect(stdout.join("")).toContain("--offset 2");
  });

  test("API error is surfaced and exits 1", async () => {
    listApmServicesFn.mockRejectedValueOnce(new Error("boom"));
    const { context, stderr, getExitCode } = createMockContext();
    await services.call(context, {}, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("boom");
  });
});
