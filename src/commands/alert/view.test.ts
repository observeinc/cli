import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../test-helpers";
import { resolve } from "node:path";
import {
  AlertLevel as AlertLevelEnum,
  AlertStatus,
  type AlertResource,
} from "../../rest/generated";

const repoRoot = resolve(import.meta.dir, "../../..");
const getAlertModulePath = resolve(repoRoot, "src/rest/alert/get-alert.ts");

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

function alertStub(): AlertResource {
  return {
    id: "alert-1",
    level: AlertLevelEnum.Critical,
    status: AlertStatus.Active,
    muted: false,
    start: "2026-07-01T00:00:00Z",
    end: null,
    detectedStart: null,
    detectedEnd: null,
    monitorVersion: "1",
    monitor: {
      id: "mon-1",
      record: { label: "High CPU", description: "cpu monitor" },
    },
    context: [],
    capturedValues: [],
    stats: null,
  } as unknown as AlertResource;
}

let alertToReturn: AlertResource | null;
const getAlertFn = mock((_args: { config: unknown; alertId: string }) =>
  Promise.resolve(alertToReturn),
);

let view: (typeof import("./view"))["view"];

const deps = {
  loadConfig: loadConfigFn,
} as Parameters<(typeof import("./view"))["view"]>[2];

suppressAnsiColor();

beforeAll(async () => {
  void mock.module(getAlertModulePath, () => ({
    getAlert: getAlertFn,
  }));

  const mod = await import("./view.ts");
  view = mod.view;
});

afterAll(() => {
  mock.restore();
});

describe("alert view", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    getAlertFn.mockClear();
    alertToReturn = alertStub();
  });

  test("passes the alert id and emits JSON with --json", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, { json: true }, "alert-1", deps);

    expect(getAlertFn).toHaveBeenCalledTimes(1);
    const [firstArgs] = getAlertFn.mock.calls[0]!;
    expect(firstArgs).toMatchObject({ alertId: "alert-1" });
    const payload = JSON.parse(stdout.join("")) as AlertResource;
    expect(payload.id).toBe("alert-1");
  });

  test("renders a header with the id and status by default", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, {}, "alert-1", deps);
    const out = stdout.join("");
    expect(out).toContain("Alert alert-1");
    expect(out).toContain("ACTIVE");
  });

  test("errors and exits 1 when the alert is not found", async () => {
    alertToReturn = null;
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await view.call(context, {}, "missing", deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Alert not found: missing");
  });

  test("exits with code 1 on API error", async () => {
    getAlertFn.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await view.call(context, {}, "alert-1", deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });
});
