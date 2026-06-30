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
import { createWriter } from "../../lib/writer";

const TEST_MONITOR_ID = "41076897";

const loadConfigFn = mock(
  (): Config => ({
    customerId: "test-customer",
    token: "test-token",
    domain: "observeinc.com",
  }),
);

const deleteMonitorFn = mock(
  (_params: { config: Config; id: number }): Promise<void> => Promise.resolve(),
);

let deleteMonitorCommand: (typeof import("./delete"))["deleteMonitorCommand"];

let previousNoColor: string | undefined;
let previousForceColor: string | undefined;

const deps = {
  loadConfig: loadConfigFn,
  deleteMonitor: deleteMonitorFn,
} as Parameters<(typeof import("./delete"))["deleteMonitorCommand"]>[2];

beforeAll(async () => {
  previousNoColor = process.env.NO_COLOR;
  previousForceColor = process.env.FORCE_COLOR;
  process.env.NO_COLOR = "1";
  process.env.FORCE_COLOR = "0";

  const mod = await import("./delete.ts");
  deleteMonitorCommand = mod.deleteMonitorCommand;
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

describe("monitor delete — ID validation", () => {
  beforeEach(() => deleteMonitorFn.mockClear());

  test("ID exceeding MAX_SAFE_INTEGER exits with code 1", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await deleteMonitorCommand.call(
        context,
        {},
        String(Number.MAX_SAFE_INTEGER + 1),
        deps,
      );
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Invalid monitor ID");
    expect(deleteMonitorFn).not.toHaveBeenCalled();
  });

  test("non-integer ID exits with code 1 and does not call deleteMonitor", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await deleteMonitorCommand.call(context, {}, "abc", deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Invalid monitor ID");
    expect(deleteMonitorFn).not.toHaveBeenCalled();
  });

  test("float ID exits with code 1", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await deleteMonitorCommand.call(context, {}, "1.5", deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Invalid monitor ID");
  });
});

describe("monitor delete — yes guard", () => {
  beforeEach(() => deleteMonitorFn.mockClear());

  test("without --yes exits 1 with irreversible message and does not call deleteMonitor", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await deleteMonitorCommand.call(context, {}, TEST_MONITOR_ID, deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("irreversible");
    expect(deleteMonitorFn).not.toHaveBeenCalled();
  });

  test("with --yes proceeds to delete", async () => {
    const { context, stdout } = createMockContext();
    await deleteMonitorCommand.call(
      context,
      { yes: true },
      TEST_MONITOR_ID,
      deps,
    );
    expect(deleteMonitorFn).toHaveBeenCalledTimes(1);
    expect(stdout.join("")).toContain("deleted");
  });

  test("with confirmFn returning true proceeds to delete", async () => {
    const getMonitorFn = mock((_params: { config: Config; id: number }) =>
      Promise.resolve({ id: Number(TEST_MONITOR_ID), name: "Test Monitor" }),
    );
    const { context, stdout } = createMockContext();
    await deleteMonitorCommand.call(context, {}, TEST_MONITOR_ID, {
      ...deps,
      getMonitor: getMonitorFn as never,
      confirmFn: async () => true,
    });
    expect(deleteMonitorFn).toHaveBeenCalledTimes(1);
    expect(stdout.join("")).toContain("deleted");
  });

  test("with confirmFn returning false exits 1 without deleting", async () => {
    const getMonitorFn = mock((_params: { config: Config; id: number }) =>
      Promise.resolve({ id: Number(TEST_MONITOR_ID), name: "Test Monitor" }),
    );
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await deleteMonitorCommand.call(context, {}, TEST_MONITOR_ID, {
        ...deps,
        getMonitor: getMonitorFn as never,
        confirmFn: async () => false,
      });
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("cancelled");
    expect(deleteMonitorFn).not.toHaveBeenCalled();
  });
});

describe("monitor delete — API forwarding", () => {
  beforeEach(() => deleteMonitorFn.mockClear());

  test("passes the correct numeric ID to deleteMonitor", async () => {
    const { context } = createMockContext();
    await deleteMonitorCommand.call(
      context,
      { yes: true },
      TEST_MONITOR_ID,
      deps,
    );
    expect(deleteMonitorFn).toHaveBeenCalledTimes(1);
    expect(deleteMonitorFn.mock.calls[0]![0]).toMatchObject({
      id: Number(TEST_MONITOR_ID),
    });
  });
});

describe("monitor delete — output", () => {
  beforeEach(() => deleteMonitorFn.mockClear());

  test("prints success message containing the monitor ID", async () => {
    const { context, stdout } = createMockContext();
    await deleteMonitorCommand.call(
      context,
      { yes: true },
      TEST_MONITOR_ID,
      deps,
    );
    expect(stdout.join("")).toContain(TEST_MONITOR_ID);
    expect(stdout.join("")).toContain("deleted");
  });
});

describe("monitor delete — error handling", () => {
  beforeEach(() => {
    deleteMonitorFn.mockClear();
    loadConfigFn.mockClear();
  });

  test("loadConfig error exits with code 1 and prints to stderr", async () => {
    loadConfigFn.mockImplementationOnce((): never => {
      throw new Error("no config file found");
    });
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await deleteMonitorCommand.call(
        context,
        { yes: true },
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

  test("deleteMonitor rejection exits with code 1 and prints to stderr", async () => {
    deleteMonitorFn.mockImplementationOnce(() =>
      Promise.reject(new Error("not found")),
    );
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await deleteMonitorCommand.call(
        context,
        { yes: true },
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
