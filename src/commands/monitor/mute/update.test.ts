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

const deps = {
  loadConfig: loadConfigFn,
} as Parameters<(typeof import("./update"))["update"]>[2];

suppressAnsiColor();

beforeAll(async () => {
  void mock.module(restModulePath, () => ({
    updateMonitorMute: updateMonitorMuteFn,
  }));

  const mod = await import("./update.ts");
  update = mod.update;
});

afterAll(() => {
  mock.restore();
});

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
    await update.call(context, { json: true }, "mute-1", deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Nothing to update");
    expect(updateMonitorMuteFn).not.toHaveBeenCalled();
  });

  test("exits 1 on API error", async () => {
    updateMonitorMuteFn.mockImplementationOnce(() => {
      throw new Error("bad schedule");
    });
    const { context, stderr, getExitCode } = createMockContext();
    await update.call(context, { label: "x" }, "mute-1", deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });
});
