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
const restModulePath = resolve(
  repoRoot,
  "src/rest/monitor-mute/create-monitor-mute.ts",
);

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

const createMonitorMuteFn = mock((_args: unknown) =>
  Promise.resolve({ id: "mute-1", label: "Snooze checkout" }),
);

let create: (typeof import("./create"))["create"];

let previousNoColor: string | undefined;
let previousForceColor: string | undefined;

const deps = {
  loadConfig: loadConfigFn,
} as Parameters<(typeof import("./create"))["create"]>[1];

beforeAll(async () => {
  previousNoColor = process.env.NO_COLOR;
  previousForceColor = process.env.FORCE_COLOR;
  process.env.NO_COLOR = "1";
  process.env.FORCE_COLOR = "0";

  void mock.module(restModulePath, () => ({
    createMonitorMute: createMonitorMuteFn,
  }));

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

describe("monitor mute create", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    createMonitorMuteFn.mockClear();
  });

  test("builds the request body from flags and forwards it", async () => {
    const { context, stdout } = createMockContext();
    await create.call(
      context,
      {
        label: "Snooze checkout",
        monitors: ["42", "43"],
        start: "2026-06-23T18:00:00Z",
        end: "2026-06-23T20:00:00Z",
        json: true,
      },
      deps,
    );

    expect(createMonitorMuteFn).toHaveBeenCalledTimes(1);
    const [args] = createMonitorMuteFn.mock.calls[0]!;
    expect((args as { body: unknown }).body).toMatchObject({
      label: "Snooze checkout",
      target: { kind: "Monitors", monitors: [{ id: "42" }, { id: "43" }] },
      schedule: {
        kind: "OneTime",
        oneTime: {
          startTime: "2026-06-23T18:00:00Z",
          endTime: "2026-06-23T20:00:00Z",
        },
      },
    });
    const output = JSON.parse(stdout.join(""));
    expect(output.id).toBe("mute-1");
  });

  test("builds a recurring + global body (with filter)", async () => {
    const { context } = createMockContext();
    await create.call(
      context,
      {
        label: "Weekday business hours",
        global: true,
        filter: 'level == "Critical"',
        cron: "0 9 * * 1-5",
        timezone: "America/Los_Angeles",
        duration: 3600,
        json: true,
      },
      deps,
    );

    const [args] = createMonitorMuteFn.mock.calls[0]!;
    expect((args as { body: unknown }).body).toMatchObject({
      target: { kind: "Global" },
      filter: 'level == "Critical"',
      schedule: {
        kind: "Recurring",
        recurring: {
          cronSchedule: {
            rawCron: "0 9 * * 1-5",
            timezone: "America/Los_Angeles",
          },
          durationSeconds: 3600,
        },
      },
    });
  });

  test("exits 1 when no target is given", async () => {
    const { context, getExitCode, stderr } = createMockContext();
    try {
      await create.call(
        context,
        { label: "x", start: "2026-06-23T18:00:00Z", json: true },
        deps,
      );
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("target");
    expect(createMonitorMuteFn).not.toHaveBeenCalled();
  });

  test("exits 1 when no schedule is given", async () => {
    const { context, getExitCode, stderr } = createMockContext();
    try {
      await create.call(context, { label: "x", monitors: ["42"] }, deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("schedule");
    expect(createMonitorMuteFn).not.toHaveBeenCalled();
  });

  test("exits 1 when --global is used without --filter", async () => {
    const { context, getExitCode, stderr } = createMockContext();
    try {
      await create.call(
        context,
        { label: "x", global: true, start: "2026-06-23T18:00:00Z" },
        deps,
      );
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("--filter");
    expect(createMonitorMuteFn).not.toHaveBeenCalled();
  });

  test("exits 1 on API error", async () => {
    createMonitorMuteFn.mockImplementationOnce(() => {
      throw new Error("bad target");
    });
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await create.call(
        context,
        { label: "x", monitors: ["42"], start: "2026-06-23T18:00:00Z" },
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
