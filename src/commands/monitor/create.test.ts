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

const STUB_CREATE_FILE = JSON.stringify({
  name: "My Monitor",
  ruleKind: MonitorV2RuleKind.Count,
  definition: STUB_DEFINITION,
});

function monitorStub(overrides: Partial<MonitorV2> = {}): MonitorV2 {
  return {
    id: "99001",
    name: "My Monitor",
    ruleKind: MonitorV2RuleKind.Count,
    definition: STUB_DEFINITION,
    ...overrides,
  };
}

const createMonitorFn = mock(
  (_params: { config: Config; monitorV2: object }): Promise<MonitorV2> =>
    Promise.resolve(monitorStub()),
);

const getMonitorFn = mock(
  (_params: { config: Config; id: number }): Promise<MonitorV2 | null> =>
    Promise.resolve(monitorStub()),
);

const readFileFn = mock((_path: string): string => STUB_CREATE_FILE);

let create: (typeof import("./create"))["create"];

const deps = {
  loadConfig: loadConfigFn,
  createMonitor: createMonitorFn,
  getMonitor: getMonitorFn,
  readFile: readFileFn,
} as Parameters<(typeof import("./create"))["create"]>[1];

suppressAnsiColor();

beforeAll(async () => {
  const mod = await import("./create.ts");
  create = mod.create;
});

afterAll(() => {
  mock.restore();
});

describe("monitor create — API forwarding", () => {
  beforeEach(() => {
    createMonitorFn.mockClear();
    getMonitorFn.mockClear();
    readFileFn.mockClear();
    loadConfigFn.mockClear();
  });

  test("passes name, ruleKind, and definition from --file to createMonitor", async () => {
    const { context } = createMockContext();
    await create.call(context, { file: "/fake/monitor.json" }, deps);
    expect(createMonitorFn).toHaveBeenCalledTimes(1);
    const call = createMonitorFn.mock.calls[0]![0] as unknown as {
      monitorV2: { name: string; ruleKind: string; definition: unknown };
    };
    expect(call.monitorV2.name).toBe("My Monitor");
    expect(call.monitorV2.ruleKind).toBe(MonitorV2RuleKind.Count);
    expect(call.monitorV2.definition).toMatchObject(STUB_DEFINITION);
  });

  test("reads file from the provided path", async () => {
    const { context } = createMockContext();
    await create.call(context, { file: "/path/to/monitor.json" }, deps);
    expect(readFileFn).toHaveBeenCalledWith("/path/to/monitor.json");
  });

  test("includes actionRules when present in --file", async () => {
    const actionRules = [{ actionId: "act-1" }];
    readFileFn.mockImplementationOnce(() =>
      JSON.stringify({
        name: "My Monitor",
        ruleKind: MonitorV2RuleKind.Count,
        definition: STUB_DEFINITION,
        actionRules,
      }),
    );
    const { context } = createMockContext();
    await create.call(context, { file: "/monitor.json" }, deps);
    const call = createMonitorFn.mock.calls[0]![0] as unknown as {
      monitorV2: { actionRules: unknown[] };
    };
    expect(call.monitorV2.actionRules).toEqual(actionRules);
  });

  test("omits actionRules when not present in --file", async () => {
    const { context } = createMockContext();
    await create.call(context, { file: "/monitor.json" }, deps);
    const call = createMonitorFn.mock.calls[0]![0] as unknown as {
      monitorV2: object;
    };
    expect(call.monitorV2).not.toHaveProperty("actionRules");
  });
});

describe("monitor create — output", () => {
  beforeEach(() => {
    createMonitorFn.mockClear();
    getMonitorFn.mockClear();
    readFileFn.mockClear();
  });

  test("prints success message with monitor ID", async () => {
    createMonitorFn.mockImplementationOnce(() =>
      Promise.resolve(monitorStub({ id: "99001" })),
    );
    const { context, stdout } = createMockContext();
    await create.call(context, { file: "/monitor.json" }, deps);
    expect(stdout.join("")).toContain("99001");
    expect(stdout.join("")).toContain("created");
  });

  test("--json fetches and writes the full created monitor", async () => {
    createMonitorFn.mockImplementationOnce(() =>
      Promise.resolve(monitorStub({ id: "99001" })),
    );
    getMonitorFn.mockImplementationOnce(() =>
      Promise.resolve(monitorStub({ id: "99001", name: "My Monitor" })),
    );
    const { context, stdout } = createMockContext();
    await create.call(context, { file: "/monitor.json", json: true }, deps);
    expect(getMonitorFn).toHaveBeenCalledTimes(1);
    expect(getMonitorFn.mock.calls[0]![0]).toMatchObject({ id: 99001 });
    const result = JSON.parse(stdout.join("")) as MonitorV2;
    expect(result).toMatchObject({ id: "99001", name: "My Monitor" });
  });
});

describe("monitor create — file validation", () => {
  beforeEach(() => {
    createMonitorFn.mockClear();
    readFileFn.mockClear();
  });

  test("missing name field exits with code 1", async () => {
    readFileFn.mockImplementationOnce(() =>
      JSON.stringify({
        ruleKind: MonitorV2RuleKind.Count,
        definition: STUB_DEFINITION,
      }),
    );
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await create.call(context, { file: "/monitor.json" }, deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("name");
    expect(createMonitorFn).not.toHaveBeenCalled();
  });

  test("missing ruleKind field exits with code 1", async () => {
    readFileFn.mockImplementationOnce(() =>
      JSON.stringify({ name: "My Monitor", definition: STUB_DEFINITION }),
    );
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await create.call(context, { file: "/monitor.json" }, deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("ruleKind");
    expect(createMonitorFn).not.toHaveBeenCalled();
  });

  test("missing definition field exits with code 1", async () => {
    readFileFn.mockImplementationOnce(() =>
      JSON.stringify({ name: "My Monitor", ruleKind: MonitorV2RuleKind.Count }),
    );
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await create.call(context, { file: "/monitor.json" }, deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("definition");
    expect(createMonitorFn).not.toHaveBeenCalled();
  });

  test("invalid JSON in --file exits with code 1 and mentions the flag", async () => {
    readFileFn.mockImplementationOnce(() => "{ invalid json {{");
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await create.call(context, { file: "/monitor.json" }, deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("--file");
  });
});

describe("monitor create — error handling", () => {
  beforeEach(() => {
    createMonitorFn.mockClear();
    getMonitorFn.mockClear();
    readFileFn.mockClear();
    loadConfigFn.mockClear();
  });

  test("createMonitor rejection exits with code 1 and prints to stderr", async () => {
    createMonitorFn.mockImplementationOnce(() =>
      Promise.reject(new Error("network failure")),
    );
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await create.call(context, { file: "/monitor.json" }, deps);
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
      await create.call(context, { file: "/monitor.json" }, deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });

  test("readFile throwing exits with code 1", async () => {
    readFileFn.mockImplementationOnce((): never => {
      throw new Error(
        "ENOENT: no such file or directory, open '/monitor.json'",
      );
    });
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await create.call(context, { file: "/monitor.json" }, deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });

  test("createMonitor returning invalid id exits with code 1", async () => {
    createMonitorFn.mockImplementationOnce(() =>
      Promise.resolve({ id: undefined } as unknown as MonitorV2),
    );
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await create.call(context, { file: "/monitor.json" }, deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });

  test("getMonitor returning null after create exits with code 1", async () => {
    createMonitorFn.mockImplementationOnce(() =>
      Promise.resolve(monitorStub({ id: "99001" })),
    );
    getMonitorFn.mockImplementationOnce(() => Promise.resolve(null));
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await create.call(context, { file: "/monitor.json", json: true }, deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });
});
