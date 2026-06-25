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
    id: "99001",
    name: "New Monitor",
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

const readFileFn = mock((_path: string): string =>
  JSON.stringify(STUB_DEFINITION),
);

let create: (typeof import("./create"))["create"];

let previousNoColor: string | undefined;
let previousForceColor: string | undefined;

const deps = {
  loadConfig: loadConfigFn,
  createMonitor: createMonitorFn,
  getMonitor: getMonitorFn,
  readFile: readFileFn,
} as Parameters<(typeof import("./create"))["create"]>[1];

beforeAll(async () => {
  previousNoColor = process.env.NO_COLOR;
  previousForceColor = process.env.FORCE_COLOR;
  process.env.NO_COLOR = "1";
  process.env.FORCE_COLOR = "0";

  const mod = await import("./create.ts");
  create = mod.create;
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

describe("monitor create — API forwarding", () => {
  beforeEach(() => {
    createMonitorFn.mockClear();
    getMonitorFn.mockClear();
    readFileFn.mockClear();
    loadConfigFn.mockClear();
  });

  test("passes name, ruleKind, and parsed definition to createMonitor", async () => {
    const { context } = createMockContext();
    await create.call(
      context,
      {
        name: "My Monitor",
        ruleKind: MonitorV2RuleKind.Count,
        definitionFile: "/fake/definition.json",
      },
      deps,
    );
    expect(createMonitorFn).toHaveBeenCalledTimes(1);
    const call = createMonitorFn.mock.calls[0]![0] as unknown as {
      monitorV2: { name: string; ruleKind: string; definition: unknown };
    };
    expect(call.monitorV2.name).toBe("My Monitor");
    expect(call.monitorV2.ruleKind).toBe(MonitorV2RuleKind.Count);
    expect(call.monitorV2.definition).toMatchObject(STUB_DEFINITION);
  });

  test("reads definition from definitionFile path", async () => {
    const { context } = createMockContext();
    await create.call(
      context,
      {
        name: "My Monitor",
        ruleKind: MonitorV2RuleKind.Threshold,
        definitionFile: "/path/to/def.json",
      },
      deps,
    );
    expect(readFileFn).toHaveBeenCalledWith("/path/to/def.json");
  });

  test("includes actionRules when --action-rules-file is provided", async () => {
    const actionRules = [{ actionId: "act-1" }];
    readFileFn.mockImplementationOnce(() => JSON.stringify(STUB_DEFINITION));
    readFileFn.mockImplementationOnce(() => JSON.stringify(actionRules));
    const { context } = createMockContext();
    await create.call(
      context,
      {
        name: "My Monitor",
        ruleKind: MonitorV2RuleKind.Count,
        definitionFile: "/def.json",
        actionRulesFile: "/rules.json",
      },
      deps,
    );
    const call = createMonitorFn.mock.calls[0]![0] as unknown as {
      monitorV2: { actionRules: unknown[] };
    };
    expect(call.monitorV2.actionRules).toEqual(actionRules);
  });

  test("omits actionRules when --action-rules-file is not provided", async () => {
    const { context } = createMockContext();
    await create.call(
      context,
      {
        name: "My Monitor",
        ruleKind: MonitorV2RuleKind.Count,
        definitionFile: "/def.json",
      },
      deps,
    );
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
    await create.call(
      context,
      {
        name: "My Monitor",
        ruleKind: MonitorV2RuleKind.Count,
        definitionFile: "/def.json",
      },
      deps,
    );
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
    await create.call(
      context,
      {
        name: "My Monitor",
        ruleKind: MonitorV2RuleKind.Count,
        definitionFile: "/def.json",
        json: true,
      },
      deps,
    );
    expect(getMonitorFn).toHaveBeenCalledTimes(1);
    expect(getMonitorFn.mock.calls[0]![0]).toMatchObject({ id: 99001 });
    const result = JSON.parse(stdout.join("")) as MonitorV2;
    expect(result).toMatchObject({ id: "99001", name: "My Monitor" });
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
      await create.call(
        context,
        {
          name: "My Monitor",
          ruleKind: MonitorV2RuleKind.Count,
          definitionFile: "/def.json",
        },
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
      await create.call(
        context,
        {
          name: "My Monitor",
          ruleKind: MonitorV2RuleKind.Count,
          definitionFile: "/def.json",
        },
        deps,
      );
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });

  test("readFile throwing for --definition-file exits with code 1", async () => {
    readFileFn.mockImplementationOnce((): never => {
      throw new Error("ENOENT: no such file or directory, open '/def.json'");
    });
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await create.call(
        context,
        {
          name: "My Monitor",
          ruleKind: MonitorV2RuleKind.Count,
          definitionFile: "/def.json",
        },
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
    readFileFn.mockImplementationOnce(() => "{ invalid json {{");
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await create.call(
        context,
        {
          name: "My Monitor",
          ruleKind: MonitorV2RuleKind.Count,
          definitionFile: "/def.json",
        },
        deps,
      );
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("--definition-file");
  });

  test("readFile throwing for --action-rules-file exits with code 1", async () => {
    readFileFn.mockImplementationOnce(() => JSON.stringify(STUB_DEFINITION));
    readFileFn.mockImplementationOnce((): never => {
      throw new Error("ENOENT: no such file or directory, open '/rules.json'");
    });
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await create.call(
        context,
        {
          name: "My Monitor",
          ruleKind: MonitorV2RuleKind.Count,
          definitionFile: "/def.json",
          actionRulesFile: "/rules.json",
        },
        deps,
      );
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });

  test("invalid JSON in --action-rules-file exits with code 1 and mentions the flag", async () => {
    readFileFn.mockImplementationOnce(() => JSON.stringify(STUB_DEFINITION));
    readFileFn.mockImplementationOnce(() => "not json at all");
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await create.call(
        context,
        {
          name: "My Monitor",
          ruleKind: MonitorV2RuleKind.Count,
          definitionFile: "/def.json",
          actionRulesFile: "/rules.json",
        },
        deps,
      );
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("--action-rules-file");
  });

  test("createMonitor returning invalid id exits with code 1", async () => {
    createMonitorFn.mockImplementationOnce(() =>
      Promise.resolve({ id: undefined } as unknown as MonitorV2),
    );
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await create.call(
        context,
        {
          name: "My Monitor",
          ruleKind: MonitorV2RuleKind.Count,
          definitionFile: "/def.json",
        },
        deps,
      );
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
      await create.call(
        context,
        {
          name: "My Monitor",
          ruleKind: MonitorV2RuleKind.Count,
          definitionFile: "/def.json",
          json: true,
        },
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
