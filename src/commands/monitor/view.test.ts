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

const loadConfigFn = mock(
  (): Config => ({
    customerId: "test-customer",
    token: "test-token",
    domain: "observeinc.com",
  }),
);

function monitorStub(
  id: string,
  overrides: Partial<MonitorV2> = {},
): MonitorV2 {
  return {
    id,
    name: "Test Monitor",
    ruleKind: MonitorV2RuleKind.Count,
    definition: {} as MonitorV2["definition"],
    ...overrides,
  };
}

const getMonitorFn = mock(
  (_params: { config: Config; id: number }): Promise<MonitorV2 | null> =>
    Promise.resolve(monitorStub("42")),
);

let view: (typeof import("./view"))["view"];

const deps = {
  loadConfig: loadConfigFn,
  getMonitor: getMonitorFn,
} as Parameters<(typeof import("./view"))["view"]>[2];

suppressAnsiColor();

beforeAll(async () => {
  const mod = await import("./view.ts");
  view = mod.view;
});

afterAll(() => {
  mock.restore();
});

describe("monitor view — ID validation", () => {
  beforeEach(() => getMonitorFn.mockClear());

  test("ID exceeding MAX_SAFE_INTEGER exits with code 1", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await view.call(context, {}, String(Number.MAX_SAFE_INTEGER + 1), deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Invalid monitor ID");
    expect(getMonitorFn).not.toHaveBeenCalled();
  });

  test("non-integer ID exits with code 1", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await view.call(context, {}, "abc", deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Invalid monitor ID");
    expect(getMonitorFn).not.toHaveBeenCalled();
  });

  test("float ID exits with code 1", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await view.call(context, {}, "1.5", deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Invalid monitor ID");
  });
});

describe("monitor view — not found", () => {
  beforeEach(() => getMonitorFn.mockClear());

  test("exits with code 1 and includes ID in error when monitor not found", async () => {
    getMonitorFn.mockImplementationOnce(() => Promise.resolve(null));
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await view.call(context, {}, "99999", deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("99999");
  });
});

describe("monitor view — API forwarding", () => {
  beforeEach(() => getMonitorFn.mockClear());

  test("passes numeric ID to getMonitor", async () => {
    const { context } = createMockContext();
    await view.call(context, { json: true }, "42", deps);
    expect(getMonitorFn).toHaveBeenCalledTimes(1);
    expect(getMonitorFn.mock.calls[0]![0]).toMatchObject({ id: 42 });
  });
});

describe("monitor view — output", () => {
  beforeEach(() => getMonitorFn.mockClear());

  test("JSON output matches MonitorV2 shape", async () => {
    getMonitorFn.mockImplementationOnce(() =>
      Promise.resolve(
        monitorStub("42", {
          name: "My Monitor",
          ruleKind: MonitorV2RuleKind.Threshold,
        }),
      ),
    );
    const { context, stdout } = createMockContext();
    await view.call(context, { json: true }, "42", deps);
    const result = JSON.parse(stdout.join("")) as MonitorV2;
    expect(result).toMatchObject({
      id: "42",
      name: "My Monitor",
      ruleKind: MonitorV2RuleKind.Threshold,
    });
  });
});

describe("monitor view — error handling", () => {
  beforeEach(() => {
    getMonitorFn.mockClear();
    loadConfigFn.mockClear();
  });

  test("loadConfig error exits with code 1 and prints to stderr", async () => {
    loadConfigFn.mockImplementationOnce((): never => {
      throw new Error("no config file found");
    });
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await view.call(context, {}, "42", deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });

  test("API error exits with code 1 and prints to stderr", async () => {
    getMonitorFn.mockImplementationOnce(() =>
      Promise.reject(new Error("network failure")),
    );
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await view.call(context, { json: true }, "42", deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });
});
