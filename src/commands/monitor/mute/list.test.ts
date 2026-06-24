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
import { MonitorMuteTargetKind } from "../../../rest/generated";
import { createWriter } from "../../../lib/writer";

const repoRoot = resolve(import.meta.dir, "../../../..");
const restModulePath = resolve(
  repoRoot,
  "src/rest/monitor-mute/list-monitor-mutes.ts",
);

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

const listMonitorMutesFn = mock((_args: unknown) =>
  Promise.resolve({
    monitorMutes: [
      {
        id: "mute-1",
        label: "Snooze checkout",
        description: null,
        target: { kind: "Monitors", monitors: [{ id: "42" }, { id: "43" }] },
        schedule: {
          kind: "OneTime",
          oneTime: { startTime: "t", endTime: "u" },
        },
        filter: null,
        startTime: "t",
        endTime: "u",
      },
      {
        id: "mute-2",
        label: "Global maintenance",
        description: null,
        target: { kind: "Global", monitors: [] },
        schedule: {
          kind: "OneTime",
          oneTime: { startTime: "t", endTime: null },
        },
        filter: 'level == "Critical"',
        startTime: "t",
        endTime: null,
      },
    ],
    meta: { totalCount: 2 },
  }),
);

let list: (typeof import("./list"))["list"];

let previousNoColor: string | undefined;
let previousForceColor: string | undefined;

const deps = {
  loadConfig: loadConfigFn,
} as Parameters<(typeof import("./list"))["list"]>[1];

beforeAll(async () => {
  previousNoColor = process.env.NO_COLOR;
  previousForceColor = process.env.FORCE_COLOR;
  process.env.NO_COLOR = "1";
  process.env.FORCE_COLOR = "0";

  void mock.module(restModulePath, () => ({
    listMonitorMutes: listMonitorMutesFn,
  }));

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

describe("monitor-mute list", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    listMonitorMutesFn.mockClear();
  });

  test("passes no filter when no flags are set", async () => {
    const { context } = createMockContext();
    await list.call(context, { limit: 100, json: true }, deps);

    expect(listMonitorMutesFn).toHaveBeenCalledTimes(1);
    const [args] = listMonitorMutesFn.mock.calls[0]!;
    expect((args as { filter?: string }).filter).toBeUndefined();
  });

  test("builds a label match filter from --match", async () => {
    const { context } = createMockContext();
    await list.call(
      context,
      { limit: 100, match: "checkout", json: true },
      deps,
    );

    const [args] = listMonitorMutesFn.mock.calls[0]!;
    expect((args as { filter?: string }).filter).toBe(
      'label.matches("(?i)checkout")',
    );
  });

  test("combines --match and --kind with &&", async () => {
    const { context } = createMockContext();
    await list.call(
      context,
      {
        limit: 100,
        match: "checkout",
        kind: MonitorMuteTargetKind.Global,
        json: true,
      },
      deps,
    );

    const [args] = listMonitorMutesFn.mock.calls[0]!;
    expect((args as { filter?: string }).filter).toBe(
      'label.matches("(?i)checkout") && target.kind == "Global"',
    );
  });

  test("emits the resolved mute rules as JSON", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 100, json: true }, deps);

    const output = JSON.parse(stdout.join(""));
    expect(output).toHaveLength(2);
    expect(output[0].id).toBe("mute-1");
  });

  test("renders an empty-state message when nothing matches", async () => {
    listMonitorMutesFn.mockImplementationOnce(() =>
      Promise.resolve({ monitorMutes: [], meta: { totalCount: 0 } }),
    );
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 100 }, deps);

    expect(stdout.join("")).toContain("No monitor mutes found.");
  });
});
