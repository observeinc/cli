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

const deps = {
  loadConfig: loadConfigFn,
} as Parameters<(typeof import("./delete"))["remove"]>[2];

suppressAnsiColor();

beforeAll(async () => {
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
});

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
    await remove.call(context, {}, "mute-1", deps);
    expect(getMonitorMuteFn).toHaveBeenCalledTimes(1);
    expect(deleteMonitorMuteFn).not.toHaveBeenCalled();
    expect(getExitCode()).toBe(1);
  });

  test("exits 1 on API error", async () => {
    deleteMonitorMuteFn.mockImplementationOnce(() => {
      throw new Error("not found");
    });
    const { context, stderr, getExitCode } = createMockContext();
    await remove.call(context, { yes: true }, "missing", deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });
});
