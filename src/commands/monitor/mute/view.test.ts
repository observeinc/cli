import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../../test-helpers";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dir, "../../../..");
const restModulePath = resolve(
  repoRoot,
  "src/rest/monitor-mute/get-monitor-mute.ts",
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
    description: "noisy deploy",
    target: {
      kind: "Monitors",
      monitors: [{ id: "42", record: { label: "Checkout latency" } }],
    },
    schedule: { kind: "OneTime", oneTime: { startTime: "t", endTime: "u" } },
    filter: null,
    startTime: "t",
    endTime: "u",
    createdBy: { id: "u1", label: "Ada" },
    createdAt: "t",
    updatedBy: { id: "u1", label: "Ada" },
    updatedAt: "t",
  }),
);

let view: (typeof import("./view"))["view"];

const deps = {
  loadConfig: loadConfigFn,
} as Parameters<(typeof import("./view"))["view"]>[2];

suppressAnsiColor();

beforeAll(async () => {
  void mock.module(restModulePath, () => ({
    getMonitorMute: getMonitorMuteFn,
  }));

  const mod = await import("./view.ts");
  view = mod.view;
});

afterAll(() => {
  mock.restore();
});

describe("monitor-mute view", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    getMonitorMuteFn.mockClear();
  });

  test("fetches by id and emits JSON", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, { json: true }, "mute-1", deps);

    expect(getMonitorMuteFn).toHaveBeenCalledTimes(1);
    const [args] = getMonitorMuteFn.mock.calls[0]!;
    expect((args as { id: string }).id).toBe("mute-1");
    const output = JSON.parse(stdout.join(""));
    expect(output.id).toBe("mute-1");
  });

  test("renders the mute details in the default view", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, {}, "mute-1", deps);

    const out = stdout.join("");
    expect(out).toContain("Monitor mute mute-1");
    expect(out).toContain("Snooze checkout");
  });
});
