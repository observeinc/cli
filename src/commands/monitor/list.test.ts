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
import { MonitorV2RuleKind, type MonitorV2Terse } from "../../rest/generated";
import { createWriter } from "../../lib/writer";

const loadConfigFn = mock(
  (): Config => ({
    customerId: "test-customer",
    token: "test-token",
    domain: "observeinc.com",
  }),
);

function monitorTerseStub(
  id: string,
  name: string,
  overrides: Partial<MonitorV2Terse> = {},
): MonitorV2Terse {
  return {
    id,
    name,
    description: "",
    disabled: false,
    ruleKind: MonitorV2RuleKind.Count,
    ...overrides,
  };
}

const STUB_MONITORS: MonitorV2Terse[] = [
  monitorTerseStub("1", "Alpha Monitor", { ruleKind: MonitorV2RuleKind.Count }),
  monitorTerseStub("2", "Beta Monitor", {
    ruleKind: MonitorV2RuleKind.Threshold,
    disabled: true,
  }),
  monitorTerseStub("3", "Gamma Monitor", {
    ruleKind: MonitorV2RuleKind.Promote,
  }),
];

const listMonitorsFn = mock(
  (_params: { config: Config; nameSubstring?: string }) =>
    Promise.resolve([...STUB_MONITORS]),
);

let list: (typeof import("./list"))["list"];

let previousNoColor: string | undefined;
let previousForceColor: string | undefined;

const deps = {
  loadConfig: loadConfigFn,
  listMonitors: listMonitorsFn,
} as Parameters<(typeof import("./list"))["list"]>[1];

beforeAll(async () => {
  previousNoColor = process.env.NO_COLOR;
  previousForceColor = process.env.FORCE_COLOR;
  process.env.NO_COLOR = "1";
  process.env.FORCE_COLOR = "0";

  const mod = await import("./list.ts");
  list = mod.list;
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

describe("monitor list — API forwarding", () => {
  beforeEach(() => {
    listMonitorsFn.mockClear();
    loadConfigFn.mockClear();
  });

  test("calls listMonitors with nameSubstring when --match is set", async () => {
    const { context } = createMockContext();
    await list.call(context, { match: "alpha", json: true }, deps);
    expect(listMonitorsFn).toHaveBeenCalledTimes(1);
    expect(listMonitorsFn.mock.calls[0]![0]).toMatchObject({
      nameSubstring: "alpha",
    });
  });

  test("calls listMonitors without nameSubstring when --match is absent", async () => {
    const { context } = createMockContext();
    await list.call(context, { json: true }, deps);
    expect(listMonitorsFn).toHaveBeenCalledTimes(1);
    expect(listMonitorsFn.mock.calls[0]![0].nameSubstring).toBeUndefined();
  });
});

describe("monitor list — kind filter", () => {
  beforeEach(() => listMonitorsFn.mockClear());

  test("--kind Count returns only Count monitors", async () => {
    const { context, stdout } = createMockContext();
    await list.call(
      context,
      { kind: [MonitorV2RuleKind.Count], json: true },
      deps,
    );
    const result = JSON.parse(stdout.join("")) as MonitorV2Terse[];
    expect(result.every((m) => m.ruleKind === MonitorV2RuleKind.Count)).toBe(
      true,
    );
  });

  test("--kind Count,Promote returns Count and Promote monitors", async () => {
    const { context, stdout } = createMockContext();
    await list.call(
      context,
      {
        kind: [MonitorV2RuleKind.Count, MonitorV2RuleKind.Promote],
        json: true,
      },
      deps,
    );
    const result = JSON.parse(stdout.join("")) as MonitorV2Terse[];
    expect(
      result.every((m) => m.ruleKind !== MonitorV2RuleKind.Threshold),
    ).toBe(true);
    expect(result.some((m) => m.ruleKind === MonitorV2RuleKind.Count)).toBe(
      true,
    );
    expect(result.some((m) => m.ruleKind === MonitorV2RuleKind.Promote)).toBe(
      true,
    );
  });
});

describe("monitor list — disabled filter", () => {
  beforeEach(() => listMonitorsFn.mockClear());

  test("--disabled returns only disabled monitors", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { disabled: true, json: true }, deps);
    const result = JSON.parse(stdout.join("")) as MonitorV2Terse[];
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((m) => m.disabled === true)).toBe(true);
  });

  test("--no-disabled returns only enabled monitors", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { disabled: false, json: true }, deps);
    const result = JSON.parse(stdout.join("")) as MonitorV2Terse[];
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((m) => !m.disabled)).toBe(true);
  });
});

describe("monitor list — sorting", () => {
  beforeEach(() => listMonitorsFn.mockClear());

  test("--sort name returns monitors in alphabetical order", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { sort: "name", json: true }, deps);
    const result = JSON.parse(stdout.join("")) as MonitorV2Terse[];
    const names = result.map((m) => m.name ?? "");
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  test("--sort id returns monitors in ascending numeric id order", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { sort: "id", json: true }, deps);
    const result = JSON.parse(stdout.join("")) as MonitorV2Terse[];
    const ids = result.map((m) => Number(m.id));
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
  });
});

describe("monitor list — output", () => {
  beforeEach(() => listMonitorsFn.mockClear());

  test("JSON output matches MonitorV2Terse shape", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { json: true }, deps);
    const result = JSON.parse(stdout.join("")) as MonitorV2Terse[];
    expect(result[0]).toMatchObject({
      id: "1",
      name: "Alpha Monitor",
      ruleKind: MonitorV2RuleKind.Count,
      disabled: false,
    });
  });

  test("shows warning when no monitors are returned", async () => {
    listMonitorsFn.mockImplementationOnce(() => Promise.resolve([]));
    const { context, stdout } = createMockContext();
    await list.call(context, {}, deps);
    expect(stdout.join("")).toContain("No monitors found");
  });
});

describe("monitor list — pagination", () => {
  beforeEach(() => listMonitorsFn.mockClear());

  test("--limit 2 returns only the first 2 results", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 2, json: true }, deps);
    const result = JSON.parse(stdout.join("")) as MonitorV2Terse[];
    expect(result.length).toBe(2);
    expect(result[0]!.id).toBe("1");
    expect(result[1]!.id).toBe("2");
  });

  test("--offset 1 skips the first result", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { offset: 1, json: true }, deps);
    const result = JSON.parse(stdout.join("")) as MonitorV2Terse[];
    expect(result[0]!.id).toBe("2");
  });

  test("--limit 2 --offset 1 returns one result starting from index 1", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 2, offset: 1, json: true }, deps);
    const result = JSON.parse(stdout.join("")) as MonitorV2Terse[];
    expect(result.length).toBe(2);
    expect(result[0]!.id).toBe("2");
    expect(result[1]!.id).toBe("3");
  });

  test("pagination hint shown in table output when results equal limit", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 3 }, deps);
    const out = stdout.join("");
    expect(out).toContain("--offset 3");
  });

  test("no pagination hint when results fewer than limit", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 100 }, deps);
    const out = stdout.join("");
    expect(out).not.toContain("--offset");
  });
});

describe("monitor list — error handling", () => {
  beforeEach(() => {
    listMonitorsFn.mockClear();
    loadConfigFn.mockClear();
  });

  test("loadConfig error exits with code 1 and prints to stderr", async () => {
    loadConfigFn.mockImplementationOnce((): never => {
      throw new Error("no config file found");
    });
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await list.call(context, { json: true }, deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });

  test("API error exits with code 1 and prints to stderr", async () => {
    listMonitorsFn.mockImplementationOnce(() =>
      Promise.reject(new Error("network failure")),
    );
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await list.call(context, { json: true }, deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });
});
