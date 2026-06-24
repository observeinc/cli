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
  "src/rest/monitor-mute/update-monitor-mute.ts",
);

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

const updateMonitorMuteFn = mock((_args: unknown) =>
  Promise.resolve({ id: "mute-1", label: "renamed" }),
);

let update: (typeof import("./update"))["update"];

let previousNoColor: string | undefined;
let previousForceColor: string | undefined;

const deps = {
  loadConfig: loadConfigFn,
} as Parameters<(typeof import("./update"))["update"]>[2];

beforeAll(async () => {
  previousNoColor = process.env.NO_COLOR;
  previousForceColor = process.env.FORCE_COLOR;
  process.env.NO_COLOR = "1";
  process.env.FORCE_COLOR = "0";

  void mock.module(restModulePath, () => ({
    updateMonitorMute: updateMonitorMuteFn,
  }));

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

describe("monitor mute update", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    updateMonitorMuteFn.mockClear();
  });

  test("sends only the provided fields as a partial body", async () => {
    const { context, stdout } = createMockContext();
    await update.call(
      context,
      { label: "renamed", json: true },
      "mute-1",
      deps,
    );

    expect(updateMonitorMuteFn).toHaveBeenCalledTimes(1);
    const [args] = updateMonitorMuteFn.mock.calls[0]!;
    expect(args).toMatchObject({ id: "mute-1", body: { label: "renamed" } });
    // Only the field supplied as a flag is present — no target/schedule churn.
    const body = (args as { body: Record<string, unknown> }).body;
    expect(body).not.toHaveProperty("target");
    expect(body).not.toHaveProperty("schedule");
    const output = JSON.parse(stdout.join(""));
    expect(output.label).toBe("renamed");
  });

  test("replaces the schedule when a full one-time window is given", async () => {
    const { context } = createMockContext();
    await update.call(
      context,
      {
        start: "2026-06-23T18:00:00Z",
        end: "2026-06-23T22:00:00Z",
        json: true,
      },
      "mute-1",
      deps,
    );

    const [args] = updateMonitorMuteFn.mock.calls[0]!;
    expect((args as { body: unknown }).body).toMatchObject({
      schedule: {
        kind: "OneTime",
        oneTime: {
          startTime: "2026-06-23T18:00:00Z",
          endTime: "2026-06-23T22:00:00Z",
        },
      },
    });
  });

  test("retargets to specific monitors when --monitors is given", async () => {
    const { context } = createMockContext();
    await update.call(
      context,
      { monitors: ["42", "43"], json: true },
      "mute-1",
      deps,
    );

    const [args] = updateMonitorMuteFn.mock.calls[0]!;
    expect((args as { body: unknown }).body).toMatchObject({
      target: { kind: "Monitors", monitors: [{ id: "42" }, { id: "43" }] },
    });
  });

  test("exits 1 when no fields are provided", async () => {
    const { context, getExitCode, stderr } = createMockContext();
    try {
      await update.call(context, { json: true }, "mute-1", deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Nothing to update");
    expect(updateMonitorMuteFn).not.toHaveBeenCalled();
  });

  test("exits 1 on API error", async () => {
    updateMonitorMuteFn.mockImplementationOnce(() => {
      throw new Error("bad schedule");
    });
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await update.call(context, { label: "x" }, "mute-1", deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });
});
