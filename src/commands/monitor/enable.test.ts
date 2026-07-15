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
import type { Config } from "../../lib/config";
import { MonitorV2RuleKind, type MonitorV2 } from "../../rest/generated";

const TEST_MONITOR_ID = "41076897";

const loadConfigFn = mock(
  (): Config => ({
    customerId: "test-customer",
    token: "test-token",
    domain: "observeinc.com",
  }),
);

function monitorStub(overrides: Partial<MonitorV2> = {}): MonitorV2 {
  return {
    id: TEST_MONITOR_ID,
    name: "Joe - Test Monitor",
    ruleKind: MonitorV2RuleKind.Count,
    definition: {} as MonitorV2["definition"],
    disabled: false,
    ...overrides,
  };
}

const updateMonitorFn = mock(
  (_params: { config: Config; id: number; disabled: boolean }): Promise<void> =>
    Promise.resolve(),
);

const getMonitorFn = mock(
  (_params: { config: Config; id: number }): Promise<MonitorV2 | null> =>
    Promise.resolve(monitorStub({ disabled: false })),
);

let enable: (typeof import("./enable"))["enable"];

const deps = {
  loadConfig: loadConfigFn,
  updateMonitor: updateMonitorFn,
  getMonitor: getMonitorFn,
} as Parameters<(typeof import("./enable"))["enable"]>[2];

suppressAnsiColor();

beforeAll(async () => {
  const mod = await import("./enable.ts");
  enable = mod.enable;
});

afterAll(() => {
  mock.restore();
});

describe("monitor enable — ID validation", () => {
  beforeEach(() => {
    updateMonitorFn.mockClear();
    getMonitorFn.mockClear();
  });

  test("ID exceeding MAX_SAFE_INTEGER exits with code 1", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    await enable.call(context, {}, String(Number.MAX_SAFE_INTEGER + 1), deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Invalid monitor ID");
    expect(updateMonitorFn).not.toHaveBeenCalled();
  });

  test("non-integer ID exits with code 1 and does not call updateMonitor", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    await enable.call(context, {}, "abc", deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Invalid monitor ID");
    expect(updateMonitorFn).not.toHaveBeenCalled();
  });

  test("float ID exits with code 1", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    await enable.call(context, {}, "1.5", deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Invalid monitor ID");
  });
});

describe("monitor enable — API forwarding", () => {
  beforeEach(() => {
    updateMonitorFn.mockClear();
    getMonitorFn.mockClear();
  });

  test("calls updateMonitor with disabled: false and the correct numeric ID", async () => {
    const { context } = createMockContext();
    await enable.call(context, {}, TEST_MONITOR_ID, deps);
    expect(updateMonitorFn).toHaveBeenCalledTimes(1);
    expect(updateMonitorFn.mock.calls[0]![0]).toMatchObject({
      id: Number(TEST_MONITOR_ID),
      disabled: false,
    });
  });

  test("does not call getMonitor when --json is not set", async () => {
    const { context } = createMockContext();
    await enable.call(context, {}, TEST_MONITOR_ID, deps);
    expect(getMonitorFn).not.toHaveBeenCalled();
  });

  test("calls getMonitor with numeric ID when --json is set", async () => {
    const { context } = createMockContext();
    await enable.call(context, { json: true }, TEST_MONITOR_ID, deps);
    expect(getMonitorFn).toHaveBeenCalledTimes(1);
    expect(getMonitorFn.mock.calls[0]![0]).toMatchObject({
      id: Number(TEST_MONITOR_ID),
    });
  });
});

describe("monitor enable — output", () => {
  beforeEach(() => {
    updateMonitorFn.mockClear();
    getMonitorFn.mockClear();
  });

  test("prints success message with monitor ID", async () => {
    const { context, stdout } = createMockContext();
    await enable.call(context, {}, TEST_MONITOR_ID, deps);
    expect(stdout.join("")).toContain(TEST_MONITOR_ID);
    expect(stdout.join("")).toContain("enabled");
  });

  test("JSON output contains monitor with disabled: false", async () => {
    getMonitorFn.mockImplementationOnce(() =>
      Promise.resolve(monitorStub({ disabled: false })),
    );
    const { context, stdout } = createMockContext();
    await enable.call(context, { json: true }, TEST_MONITOR_ID, deps);
    const result = JSON.parse(stdout.join("")) as MonitorV2;
    expect(result).toMatchObject({
      id: TEST_MONITOR_ID,
      name: "Joe - Test Monitor",
      disabled: false,
    });
  });
});

describe("monitor enable — error handling", () => {
  beforeEach(() => {
    updateMonitorFn.mockClear();
    getMonitorFn.mockClear();
    loadConfigFn.mockClear();
  });

  test("loadConfig error exits with code 1 and prints to stderr", async () => {
    loadConfigFn.mockImplementationOnce((): never => {
      throw new Error("no config file found");
    });
    const { context, stderr, getExitCode } = createMockContext();
    await enable.call(context, {}, TEST_MONITOR_ID, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });

  test("updateMonitor error exits with code 1 and prints to stderr", async () => {
    updateMonitorFn.mockImplementationOnce(() =>
      Promise.reject(new Error("network failure")),
    );
    const { context, stderr, getExitCode } = createMockContext();
    await enable.call(context, {}, TEST_MONITOR_ID, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });

  test("getMonitor returning null after enable exits with code 1", async () => {
    getMonitorFn.mockImplementationOnce(() => Promise.resolve(null));
    const { context, stderr, getExitCode } = createMockContext();
    await enable.call(context, { json: true }, TEST_MONITOR_ID, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });
});
