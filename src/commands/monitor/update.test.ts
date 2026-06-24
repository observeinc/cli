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
  MonitorV2RuleKind,
  type MonitorV2,
  type MonitorV2Definition,
} from "../../rest/generated";
import { createWriter } from "../../lib/writer";

const TEST_MONITOR_ID = "41076897";

const loadConfigFn = mock(
  (): Config => ({
    customerId: "test-customer",
    token: "test-token",
    domain: "observeinc.com",
  }),
);

const STUB_DEFINITION: MonitorV2Definition = {
  inputQuery: { stages: [] } as MonitorV2Definition["inputQuery"],
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

const updateMonitorFn = mock(
  (_params: { config: Config; id: number }): Promise<void> => Promise.resolve(),
);

const getMonitorFn = mock(
  (_params: { config: Config; id: number }): Promise<MonitorV2 | null> =>
    Promise.resolve(monitorStub()),
);

const readFileFn = mock((_path: string): string => JSON.stringify(STUB_DEFINITION));

let update: (typeof import("./update"))["update"];

let previousNoColor: string | undefined;
let previousForceColor: string | undefined;

const deps = {
  loadConfig: loadConfigFn,
  updateMonitor: updateMonitorFn,
  getMonitor: getMonitorFn,
  readFile: readFileFn,
} as Parameters<(typeof import("./update"))["update"]>[3];

beforeAll(async () => {
  previousNoColor = process.env.NO_COLOR;
  previousForceColor = process.env.FORCE_COLOR;
  process.env.NO_COLOR = "1";
  process.env.FORCE_COLOR = "0";

  const mod = await import("./update.ts");
  update = mod.update;
});

afterAll(() => {
  mock.restore();
  if (previousNoColor === undefined) {
    delete process.env.NO_COLOR;
  } else {
    process.env.NO_COLOR = previousNoColor;
  }
  if (previousForceColor === undefined) {
    delete process.env.FORCE_COLOR;
  } else {
    process.env.FORCE_COLOR = previousForceColor;
  }
});

function createMockContext() {
  const stdout: string[] = [];
  const stderr: string[] = [];
  let exitCode: number | undefined;

  const processMock = {
    stdout: {
      write: (msg: string) => {
        stdout.push(msg);
        return true;
      },
    },
    stderr: {
      write: (msg: string) => {
        stderr.push(msg);
        return true;
      },
    },
    exit: (code?: number) => {
      exitCode = code ?? 0;
      throw new Error("process.exit");
    },
  };

  const context = {
    process: processMock,
    writer: createWriter({ process: processMock }),
  } as unknown as LocalContext;

  return { context, stdout, stderr, getExitCode: () => exitCode };
}

describe("monitor update — ID validation", () => {
  beforeEach(() => {
    updateMonitorFn.mockClear();
    getMonitorFn.mockClear();
  });

  test("non-integer ID exits with code 1 and does not call updateMonitor", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await update.call(context, { name: "foo" }, "abc", deps);
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
      await update.call(context, { name: "foo" }, "1.5", deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Invalid monitor ID");
  });
});

describe("monitor update — no-op validation", () => {
  beforeEach(() => updateMonitorFn.mockClear());

  test("exits with code 1 when no update flags are provided", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await update.call(context, {}, TEST_MONITOR_ID, deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("At least one update flag");
    expect(updateMonitorFn).not.toHaveBeenCalled();
  });
});

describe("monitor update — API forwarding", () => {
  beforeEach(() => {
    updateMonitorFn.mockClear();
    getMonitorFn.mockClear();
    readFileFn.mockClear();
  });

  test("passes numeric ID and name to updateMonitor", async () => {
    const { context } = createMockContext();
    await update.call(context, { name: "New Name" }, TEST_MONITOR_ID, deps);
    expect(updateMonitorFn).toHaveBeenCalledTimes(1);
    const call = updateMonitorFn.mock.calls[0][0] as { id: number; name: string };
    expect(call.id).toBe(Number(TEST_MONITOR_ID));
    expect(call.name).toBe("New Name");
  });

  test("only includes explicitly provided fields in the patch", async () => {
    const { context } = createMockContext();
    await update.call(context, { name: "Only Name" }, TEST_MONITOR_ID, deps);
    const call = updateMonitorFn.mock.calls[0][0] as object;
    expect(call).not.toHaveProperty("description");
    expect(call).not.toHaveProperty("ruleKind");
    expect(call).not.toHaveProperty("definition");
  });

  test("reads and forwards definition from --definition-file", async () => {
    const { context } = createMockContext();
    await update.call(
      context,
      { definitionFile: "/path/to/def.json" },
      TEST_MONITOR_ID,
      deps,
    );
    expect(readFileFn).toHaveBeenCalledWith("/path/to/def.json");
    const call = updateMonitorFn.mock.calls[0][0] as { definition: unknown };
    expect(call.definition).toMatchObject(STUB_DEFINITION);
  });

  test("does not call getMonitor when --json is not set", async () => {
    const { context } = createMockContext();
    await update.call(context, { name: "foo" }, TEST_MONITOR_ID, deps);
    expect(getMonitorFn).not.toHaveBeenCalled();
  });

  test("calls getMonitor with numeric ID when --json is set", async () => {
    const { context } = createMockContext();
    await update.call(context, { name: "foo", json: true }, TEST_MONITOR_ID, deps);
    expect(getMonitorFn).toHaveBeenCalledTimes(1);
    expect(getMonitorFn.mock.calls[0][0]).toMatchObject({
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
    await update.call(context, { name: "foo" }, TEST_MONITOR_ID, deps);
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
      { name: "Updated Name", json: true },
      TEST_MONITOR_ID,
      deps,
    );
    const result = JSON.parse(stdout.join("")) as MonitorV2;
    expect(result).toMatchObject({ id: TEST_MONITOR_ID, name: "Updated Name" });
  });
});

describe("monitor update — ID validation", () => {
  beforeEach(() => updateMonitorFn.mockClear());

  test("ID exceeding MAX_SAFE_INTEGER exits with code 1", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await update.call(context, { name: "foo" }, String(Number.MAX_SAFE_INTEGER + 1), deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Invalid monitor ID");
    expect(updateMonitorFn).not.toHaveBeenCalled();
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
      await update.call(context, { name: "foo" }, TEST_MONITOR_ID, deps);
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
      await update.call(context, { name: "foo" }, TEST_MONITOR_ID, deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });

  test("readFile throwing for --definition-file exits with code 1", async () => {
    readFileFn.mockImplementationOnce((): never => {
      throw new Error("ENOENT: no such file or directory");
    });
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await update.call(
        context,
        { definitionFile: "/missing.json" },
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

  test("invalid JSON in --definition-file exits with code 1 and mentions the flag", async () => {
    readFileFn.mockImplementationOnce(() => "{ bad json }");
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await update.call(
        context,
        { definitionFile: "/bad.json" },
        TEST_MONITOR_ID,
        deps,
      );
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("--definition-file");
  });

  test("getMonitor returning null after update exits with code 1", async () => {
    getMonitorFn.mockImplementationOnce(() => Promise.resolve(null));
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await update.call(context, { name: "foo", json: true }, TEST_MONITOR_ID, deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });
});
