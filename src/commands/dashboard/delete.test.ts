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
import type { DashboardResource } from "../../rest/generated";
import { dashboardStub, loadConfigStub } from "./test-fixtures";
import type { DeleteDashboardDeps } from "./delete";

const TEST_DASHBOARD_ID = "43183689";

const loadConfigFn = loadConfigStub();

const deleteDashboardFn = mock(
  (_params: { config: Config; id: string }): Promise<void> => Promise.resolve(),
);

const getDashboardFn = mock(
  (_params: {
    config: Config;
    id: string;
  }): Promise<DashboardResource | null> =>
    Promise.resolve(dashboardStub({ id: TEST_DASHBOARD_ID })),
);

let deleteDashboardCommand: (typeof import("./delete"))["deleteDashboardCommand"];

const deps: DeleteDashboardDeps = {
  loadConfig: loadConfigFn,
  deleteDashboard: deleteDashboardFn,
  getDashboard: getDashboardFn,
};

suppressAnsiColor();

beforeAll(async () => {
  const mod = await import("./delete.ts");
  deleteDashboardCommand = mod.deleteDashboardCommand;
});

afterAll(() => {
  mock.restore();
});

beforeEach(() => {
  deleteDashboardFn.mockClear();
  getDashboardFn.mockClear();
});

describe("dashboard delete — confirmation guard", () => {
  test("without --yes on a non-TTY exits 1 and does not delete", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    await deleteDashboardCommand.call(context, {}, TEST_DASHBOARD_ID, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("irreversible");
    expect(deleteDashboardFn).not.toHaveBeenCalled();
  });

  test("--yes deletes without prompting or fetching the dashboard", async () => {
    const { context, stdout } = createMockContext();
    await deleteDashboardCommand.call(
      context,
      { yes: true },
      TEST_DASHBOARD_ID,
      deps,
    );
    expect(deleteDashboardFn).toHaveBeenCalledTimes(1);
    expect(getDashboardFn).not.toHaveBeenCalled();
    expect(stdout.join("")).toContain("deleted");
  });

  test("confirming at the prompt deletes", async () => {
    const { context, stdout } = createMockContext();
    await deleteDashboardCommand.call(context, {}, TEST_DASHBOARD_ID, {
      ...deps,
      confirmFn: async () => true,
    });
    expect(deleteDashboardFn).toHaveBeenCalledTimes(1);
    expect(stdout.join("")).toContain("deleted");
  });

  test("declining at the prompt exits 1 without deleting", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    await deleteDashboardCommand.call(context, {}, TEST_DASHBOARD_ID, {
      ...deps,
      confirmFn: async () => false,
    });
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("cancelled");
    expect(deleteDashboardFn).not.toHaveBeenCalled();
  });

  test("prompts with the dashboard name so the target is unambiguous", async () => {
    getDashboardFn.mockImplementationOnce(() =>
      Promise.resolve(dashboardStub({ name: "Production Overview" })),
    );
    let promptedWith: string | undefined;
    const { context } = createMockContext();
    await deleteDashboardCommand.call(context, {}, TEST_DASHBOARD_ID, {
      ...deps,
      confirmFn: async (name: string) => {
        promptedWith = name;
        return true;
      },
    });
    expect(promptedWith).toBe("Production Overview");
  });

  test("a missing dashboard exits 1 before prompting", async () => {
    getDashboardFn.mockImplementationOnce(() => Promise.resolve(null));
    let prompted = false;
    const { context, stderr, getExitCode } = createMockContext();
    await deleteDashboardCommand.call(context, {}, TEST_DASHBOARD_ID, {
      ...deps,
      confirmFn: async () => {
        prompted = true;
        return true;
      },
    });
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("not found");
    expect(prompted).toBe(false);
    expect(deleteDashboardFn).not.toHaveBeenCalled();
  });
});

describe("dashboard delete — API forwarding", () => {
  test("passes the ID through as a string", async () => {
    const { context } = createMockContext();
    await deleteDashboardCommand.call(
      context,
      { yes: true },
      TEST_DASHBOARD_ID,
      deps,
    );
    expect(deleteDashboardFn.mock.calls[0]![0]).toMatchObject({
      id: TEST_DASHBOARD_ID,
    });
  });
});

describe("dashboard delete — error handling", () => {
  test("API rejection exits 1", async () => {
    deleteDashboardFn.mockImplementationOnce(() =>
      Promise.reject(new Error("dashboard not found")),
    );
    const { context, stderr, getExitCode } = createMockContext();
    await deleteDashboardCommand.call(
      context,
      { yes: true },
      TEST_DASHBOARD_ID,
      deps,
    );
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("dashboard not found");
  });

  test("loadConfig failure exits 1", async () => {
    loadConfigFn.mockImplementationOnce((): never => {
      throw new Error("no config file found");
    });
    const { context, stderr, getExitCode } = createMockContext();
    await deleteDashboardCommand.call(
      context,
      { yes: true },
      TEST_DASHBOARD_ID,
      deps,
    );
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });
});
