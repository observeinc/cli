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
import {
  MonitorV2RuleKind,
  type MonitorV2,
  type MonitorV2Definition,
} from "../../rest/generated";

const TEST_MONITOR_ID = "41076897";

const loadConfigFn = mock(
  (): Config => ({
    customerId: "test-customer",
    token: "test-token",
    domain: "observeinc.com",
  }),
);

const STUB_DEFINITION: MonitorV2Definition = {
  inputQuery: { outputStage: "main", stages: [] },
  rules: [],
};

function monitorStub(overrides: Partial<MonitorV2> = {}): MonitorV2 {
  return {
    id: TEST_MONITOR_ID,
    name: "Joe - Test Monitor",
    ruleKind: MonitorV2RuleKind.Count,
    definition: STUB_DEFINITION,
    ...overrides,
  };
}

const STUB_FILE = JSON.stringify(monitorStub());

const updateMonitorFn = mock(
  (_params: { config: Config; id: number }): Promise<void> => Promise.resolve(),
);

const getMonitorFn = mock(
  (_params: { config: Config; id: number }): Promise<MonitorV2 | null> =>
    Promise.resolve(monitorStub()),
);

const readFileFn = mock((_path: string): string => STUB_FILE);

let update: (typeof import("./update"))["update"];

const deps = {
  loadConfig: loadConfigFn,
  updateMonitor: updateMonitorFn,
  getMonitor: getMonitorFn,
  readFile: readFileFn,
} as Parameters<(typeof import("./update"))["update"]>[2];

suppressAnsiColor();

beforeAll(async () => {
  const mod = await import("./update.ts");
  update = mod.update;
});

afterAll(() => {
  mock.restore();
});

describe("monitor update — ID validation", () => {
  beforeEach(() => {
    updateMonitorFn.mockClear();
    getMonitorFn.mockClear();
  });

  test("non-integer ID exits with code 1 and does not call updateMonitor", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await update.call(context, { file: "/monitor.json" }, "abc", deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Invalid monitor ID");
    expect(updateMonitorFn).not.toHaveBeenCalled();
  });

  test("float ID exits with code 1", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await update.call(context, { file: "/monitor.json" }, "1.5", deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Invalid monitor ID");
  });

  test("ID exceeding MAX_SAFE_INTEGER exits with code 1", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await update.call(
        context,
        { file: "/monitor.json" },
        String(Number.MAX_SAFE_INTEGER + 1),
        deps,
      );
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Invalid monitor ID");
    expect(updateMonitorFn).not.toHaveBeenCalled();
  });
});

describe("monitor update — API forwarding", () => {
  beforeEach(() => {
    updateMonitorFn.mockClear();
    getMonitorFn.mockClear();
    readFileFn.mockClear();
  });

  test("passes numeric ID and patchable fields from --file to updateMonitor", async () => {
    const { context } = createMockContext();
    await update.call(
      context,
      { file: "/monitor.json" },
      TEST_MONITOR_ID,
      deps,
    );
    expect(updateMonitorFn).toHaveBeenCalledTimes(1);
    const call = updateMonitorFn.mock.calls[0]![0] as unknown as {
      id: number;
      name: string;
      ruleKind: string;
    };
    expect(call.id).toBe(Number(TEST_MONITOR_ID));
    expect(call.name).toBe("Joe - Test Monitor");
    expect(call.ruleKind).toBe(MonitorV2RuleKind.Count);
  });

  test("excludes effectiveScheduling from patch and uses numeric id", async () => {
    readFileFn.mockImplementationOnce(() =>
      JSON.stringify({
        ...monitorStub(),
        effectiveScheduling: { type: "Default" },
      }),
    );
    const { context } = createMockContext();
    await update.call(
      context,
      { file: "/monitor.json" },
      TEST_MONITOR_ID,
      deps,
    );
    const call = updateMonitorFn.mock.calls[0]![0] as unknown as {
      id: unknown;
      effectiveScheduling?: unknown;
    };
    expect(call).not.toHaveProperty("effectiveScheduling");
    expect(call.id).toBe(Number(TEST_MONITOR_ID));
  });

  test("excludes fields absent from the file (undefined) from patch", async () => {
    readFileFn.mockImplementationOnce(() =>
      JSON.stringify({ name: "Only Name", ruleKind: MonitorV2RuleKind.Count }),
    );
    const { context } = createMockContext();
    await update.call(
      context,
      { file: "/monitor.json" },
      TEST_MONITOR_ID,
      deps,
    );
    const call = updateMonitorFn.mock.calls[0]![0] as unknown as object;
    expect(call).not.toHaveProperty("description");
    expect(call).not.toHaveProperty("definition");
    expect(call).not.toHaveProperty("actionRules");
  });

  test("does not call getMonitor when --json is not set", async () => {
    const { context } = createMockContext();
    await update.call(
      context,
      { file: "/monitor.json" },
      TEST_MONITOR_ID,
      deps,
    );
    expect(getMonitorFn).not.toHaveBeenCalled();
  });

  test("calls getMonitor with numeric ID when --json is set", async () => {
    const { context } = createMockContext();
    await update.call(
      context,
      { file: "/monitor.json", json: true },
      TEST_MONITOR_ID,
      deps,
    );
    expect(getMonitorFn).toHaveBeenCalledTimes(1);
    expect(getMonitorFn.mock.calls[0]![0]).toMatchObject({
      id: Number(TEST_MONITOR_ID),
    });
  });
});

describe("monitor update — output", () => {
  beforeEach(() => {
    updateMonitorFn.mockClear();
    getMonitorFn.mockClear();
  });

  test("prints success message with monitor ID", async () => {
    const { context, stdout } = createMockContext();
    await update.call(
      context,
      { file: "/monitor.json" },
      TEST_MONITOR_ID,
      deps,
    );
    expect(stdout.join("")).toContain(TEST_MONITOR_ID);
    expect(stdout.join("")).toContain("updated");
  });

  test("--json writes the updated monitor", async () => {
    getMonitorFn.mockImplementationOnce(() =>
      Promise.resolve(monitorStub({ name: "Updated Name" })),
    );
    const { context, stdout } = createMockContext();
    await update.call(
      context,
      { file: "/monitor.json", json: true },
      TEST_MONITOR_ID,
      deps,
    );
    const result = JSON.parse(stdout.join("")) as MonitorV2;
    expect(result).toMatchObject({ id: TEST_MONITOR_ID, name: "Updated Name" });
  });
});

describe("monitor update — error handling", () => {
  beforeEach(() => {
    updateMonitorFn.mockClear();
    loadConfigFn.mockClear();
    readFileFn.mockClear();
  });

  test("updateMonitor rejection exits with code 1 and prints to stderr", async () => {
    updateMonitorFn.mockImplementationOnce(() =>
      Promise.reject(new Error("network failure")),
    );
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await update.call(
        context,
        { file: "/monitor.json" },
        TEST_MONITOR_ID,
        deps,
      );
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });

  test("loadConfig error exits with code 1 and prints to stderr", async () => {
    loadConfigFn.mockImplementationOnce((): never => {
      throw new Error("no config file found");
    });
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await update.call(
        context,
        { file: "/monitor.json" },
        TEST_MONITOR_ID,
        deps,
      );
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });

  test("readFile throwing exits with code 1", async () => {
    readFileFn.mockImplementationOnce((): never => {
      throw new Error("ENOENT: no such file or directory");
    });
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await update.call(
        context,
        { file: "/monitor.json" },
        TEST_MONITOR_ID,
        deps,
      );
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });

  test("invalid JSON in --file exits with code 1 and mentions the flag", async () => {
    readFileFn.mockImplementationOnce(() => "{ bad json }");
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await update.call(
        context,
        { file: "/monitor.json" },
        TEST_MONITOR_ID,
        deps,
      );
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("--file");
  });

  test("getMonitor returning null after update exits with code 1", async () => {
    getMonitorFn.mockImplementationOnce(() => Promise.resolve(null));
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await update.call(
        context,
        { file: "/monitor.json", json: true },
        TEST_MONITOR_ID,
        deps,
      );
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });
});
