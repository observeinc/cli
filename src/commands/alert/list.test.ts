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
import {
  AlertLevel as AlertLevelEnum,
  AlertStatus,
  type AlertResource,
} from "../../rest/generated";
import { createMockContext, suppressAnsiColor } from "../../test-helpers";

const repoRoot = resolve(import.meta.dir, "../../..");
const listAlertsModulePath = resolve(repoRoot, "src/rest/alert/list-alerts.ts");

const loadConfigFn = mock(() => ({
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
}));

function alertStub(id: string): AlertResource {
  return {
    id,
    level: AlertLevelEnum.Critical,
    status: AlertStatus.Active,
    monitor: { id: "mon-1", record: { label: "High CPU" } },
    start: "2026-07-01T00:00:00Z",
    end: null,
    muted: false,
    context: [],
    capturedValues: [],
  } as unknown as AlertResource;
}

let lastListArgs:
  | { filter?: string; limit?: number; offset?: number; orderBy?: string }
  | undefined;
let alertsToReturn: AlertResource[];

const listAlertsFn = mock(
  (args: {
    filter?: string;
    limit?: number;
    offset?: number;
    orderBy?: string;
  }) => {
    lastListArgs = args;
    return Promise.resolve({ alerts: alertsToReturn });
  },
);

let list: (typeof import("./list"))["list"];

const deps = {
  loadConfig: loadConfigFn,
} as Parameters<(typeof import("./list"))["list"]>[1];

suppressAnsiColor();

beforeAll(async () => {
  void mock.module(listAlertsModulePath, () => ({
    listAlerts: listAlertsFn,
  }));

  const mod = await import("./list.ts");
  list = mod.list;
});

afterAll(() => {
  mock.restore();
});

describe("alert list", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    listAlertsFn.mockClear();
    lastListArgs = undefined;
    alertsToReturn = [alertStub("alert-1"), alertStub("alert-2")];
  });

  test("emits raw alerts as JSON with --json", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 100, json: true }, deps);

    const payload = JSON.parse(stdout.join("")) as AlertResource[];
    expect(payload).toHaveLength(2);
    expect(payload[0]!.id).toBe("alert-1");
  });

  test("renders a table with a count header by default", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 100 }, deps);

    const out = stdout.join("");
    expect(out).toContain("Found 2 alert(s)");
    expect(out).toContain("alert-1");
    expect(out).toContain("High CPU");
  });

  test("translates --match/--level/--active into a server filter", async () => {
    const { context } = createMockContext();
    await list.call(
      context,
      {
        limit: 100,
        match: "cpu",
        level: [AlertLevelEnum.Critical],
        active: true,
      },
      deps,
    );

    expect(lastListArgs?.filter).toBeDefined();
    expect(lastListArgs!.filter).toContain("Critical");
    expect(lastListArgs!.filter).toContain("Active");
  });

  test("warns when there are no alerts", async () => {
    alertsToReturn = [];
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 100 }, deps);
    expect(stdout.join("")).toContain("No alerts found.");
  });

  test("exits with code 1 on API error", async () => {
    listAlertsFn.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await list.call(context, { limit: 100 }, deps);
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });
});
