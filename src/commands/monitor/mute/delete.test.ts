import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import { resolve } from "node:path";
import type { LocalContext } from "../../../context";
import { createWriter } from "../../../lib/writer";

const repoRoot = resolve(import.meta.dir, "../../../..");
const getModulePath = resolve(
  repoRoot,
  "src/rest/monitor-mute/get-monitor-mute.ts",
);
const deleteModulePath = resolve(
  repoRoot,
  "src/rest/monitor-mute/delete-monitor-mute.ts",
);

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

const getMonitorMuteFn = mock((_args: unknown) =>
  Promise.resolve({
    id: "mute-1",
    label: "Snooze checkout",
    target: { kind: "Monitors", monitors: [{ id: "42" }, { id: "43" }] },
  }),
);
const deleteMonitorMuteFn = mock((_args: unknown) => Promise.resolve());

let remove: (typeof import("./delete"))["remove"];

let previousNoColor: string | undefined;
let previousForceColor: string | undefined;

const deps = {
  loadConfig: loadConfigFn,
} as Parameters<(typeof import("./delete"))["remove"]>[2];

beforeAll(async () => {
  previousNoColor = process.env.NO_COLOR;
  previousForceColor = process.env.FORCE_COLOR;
  process.env.NO_COLOR = "1";
  process.env.FORCE_COLOR = "0";

  void mock.module(getModulePath, () => ({
    getMonitorMute: getMonitorMuteFn,
  }));
  void mock.module(deleteModulePath, () => ({
    deleteMonitorMute: deleteMonitorMuteFn,
  }));

  const mod = await import("./delete.ts");
  remove = mod.remove;
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
    // Non-interactive: the confirm() helper bails out unless --yes is passed.
    stdin: { isTTY: false },
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

describe("monitor-mute delete", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    getMonitorMuteFn.mockClear();
    deleteMonitorMuteFn.mockClear();
  });

  test("with --yes, deletes without fetching or prompting", async () => {
    const { context, stdout } = createMockContext();
    await remove.call(context, { yes: true }, "mute-1", deps);

    expect(getMonitorMuteFn).not.toHaveBeenCalled();
    expect(deleteMonitorMuteFn).toHaveBeenCalledTimes(1);
    const [args] = deleteMonitorMuteFn.mock.calls[0]!;
    expect((args as { id: string }).id).toBe("mute-1");
    expect(stdout.join("")).toContain("Deleted monitor mute");
  });

  test("without --yes on a non-TTY, aborts (exit 1) and does not delete", async () => {
    const { context, getExitCode } = createMockContext();
    try {
      await remove.call(context, {}, "mute-1", deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getMonitorMuteFn).toHaveBeenCalledTimes(1);
    expect(deleteMonitorMuteFn).not.toHaveBeenCalled();
    expect(getExitCode()).toBe(1);
  });

  test("exits 1 on API error", async () => {
    deleteMonitorMuteFn.mockImplementationOnce(() => {
      throw new Error("not found");
    });
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await remove.call(context, { yes: true }, "missing", deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });
});
