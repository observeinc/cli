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
import type { Config } from "../../lib/config";
import {
  DashboardResourceVisibility,
  type DashboardContent,
  type DashboardResource,
} from "../../rest/generated";
import { dashboardStub, loadConfigStub } from "./test-fixtures";
import type { ViewDashboardDeps } from "./view";

const TEST_DASHBOARD_ID = "41217002";

const loadConfigFn = loadConfigStub();

const DEFINITION = {
  layout: { sections: [{ title: "Empty", cards: [] }] },
} as unknown as DashboardContent;

const getDashboardFn = mock(
  (_params: {
    config: Config;
    id: string;
  }): Promise<DashboardResource | null> =>
    Promise.resolve(dashboardStub({ definition: DEFINITION })),
);

let view: (typeof import("./view"))["view"];

const deps: ViewDashboardDeps = {
  loadConfig: loadConfigFn,
  getDashboard: getDashboardFn,
};

suppressAnsiColor();

beforeAll(async () => {
  const mod = await import("./view.ts");
  view = mod.view;
});

afterAll(() => {
  mock.restore();
});

beforeEach(() => {
  getDashboardFn.mockClear();
});

describe("dashboard view — lookup", () => {
  test("forwards the ID to the API as a string", async () => {
    const { context } = createMockContext();
    await view.call(context, {}, TEST_DASHBOARD_ID, deps);
    expect(getDashboardFn.mock.calls[0]![0]).toMatchObject({
      id: TEST_DASHBOARD_ID,
    });
  });

  test("does not reject non-numeric IDs before calling the API", async () => {
    const { context, getExitCode } = createMockContext();
    await view.call(context, {}, "abc", deps);
    expect(getDashboardFn).toHaveBeenCalledTimes(1);
    expect(getExitCode()).toBeUndefined();
  });

  test("missing dashboard exits 1 with a not-found message", async () => {
    getDashboardFn.mockImplementationOnce(() => Promise.resolve(null));
    const { context, stderr, getExitCode } = createMockContext();
    await view.call(context, {}, TEST_DASHBOARD_ID, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain(
      `Dashboard not found: ${TEST_DASHBOARD_ID}`,
    );
  });
});

describe("dashboard view — output", () => {
  test("default view renders envelope metadata, not the definition", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, {}, TEST_DASHBOARD_ID, deps);
    const out = stdout.join("");
    expect(out).toContain("Test Dashboard");
    expect(out).toContain("Ada Lovelace");
    expect(out).not.toContain("sections");
  });

  test("--json emits the whole document including the definition", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, { json: true }, TEST_DASHBOARD_ID, deps);
    const parsed = JSON.parse(stdout.join("")) as DashboardResource;
    expect(parsed.id).toBe(TEST_DASHBOARD_ID);
    expect(parsed.definition).toEqual(DEFINITION);
  });

  test("--json suppresses status chatter so output stays parseable", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, { json: true }, TEST_DASHBOARD_ID, deps);
    expect(stdout.join("")).not.toContain("Fetching dashboard");
    expect(() => JSON.parse(stdout.join("")) as unknown).not.toThrow();
  });

  test("renders a placeholder for an absent description and tags", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, {}, TEST_DASHBOARD_ID, deps);
    expect(stdout.join("")).toContain("-");
  });

  test("renders object tags as key=value pairs", async () => {
    getDashboardFn.mockImplementationOnce(() =>
      Promise.resolve(
        dashboardStub({ objectTags: { env: ["prod", "staging"] } }),
      ),
    );
    const { context, stdout } = createMockContext();
    await view.call(context, {}, TEST_DASHBOARD_ID, deps);
    expect(stdout.join("")).toContain("env=prod,staging");
  });

  test("falls back to the user ID when no display label is expanded", async () => {
    getDashboardFn.mockImplementationOnce(() =>
      Promise.resolve(dashboardStub({ createdBy: { id: "77" } })),
    );
    const { context, stdout } = createMockContext();
    await view.call(context, {}, TEST_DASHBOARD_ID, deps);
    expect(stdout.join("")).toContain("77");
  });

  test("shows hidden visibility", async () => {
    getDashboardFn.mockImplementationOnce(() =>
      Promise.resolve(
        dashboardStub({ visibility: DashboardResourceVisibility.Hidden }),
      ),
    );
    const { context, stdout } = createMockContext();
    await view.call(context, {}, TEST_DASHBOARD_ID, deps);
    expect(stdout.join("")).toContain("Hidden");
  });
});

describe("dashboard view — error handling", () => {
  test("loadConfig failure exits 1", async () => {
    loadConfigFn.mockImplementationOnce((): never => {
      throw new Error("no config file found");
    });
    const { context, stderr, getExitCode } = createMockContext();
    await view.call(context, {}, TEST_DASHBOARD_ID, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });

  test("API rejection exits 1", async () => {
    getDashboardFn.mockImplementationOnce(() =>
      Promise.reject(new Error("upstream unavailable")),
    );
    const { context, stderr, getExitCode } = createMockContext();
    await view.call(context, {}, TEST_DASHBOARD_ID, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("upstream unavailable");
  });
});
