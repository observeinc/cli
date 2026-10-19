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
import type {
  DashboardResource,
  DashboardUpdateRequest,
} from "../../rest/generated";
import { dashboardStub, loadConfigStub, readFileStub } from "./test-fixtures";
import type { UpdateDashboardDeps } from "./update";

const TEST_DASHBOARD_ID = "43183689";

const loadConfigFn = loadConfigStub();

const { readFile: readFileFn, withFile } = readFileStub({ name: "Renamed" });

interface UpdateArgs {
  config: Config;
  id: string;
  patch: DashboardUpdateRequest;
}

let lastUpdateArgs: UpdateArgs | undefined;

const updateDashboardFn = mock(
  (args: UpdateArgs): Promise<DashboardResource> => {
    lastUpdateArgs = args;
    return Promise.resolve(dashboardStub({ id: args.id }));
  },
);

let update: (typeof import("./update"))["update"];

const deps: UpdateDashboardDeps = {
  loadConfig: loadConfigFn,
  updateDashboard: updateDashboardFn,
  readFile: readFileFn,
};

suppressAnsiColor();

beforeAll(async () => {
  const mod = await import("./update.ts");
  update = mod.update;
});

afterAll(() => {
  mock.restore();
});

beforeEach(() => {
  updateDashboardFn.mockClear();
  readFileFn.mockClear();
  lastUpdateArgs = undefined;
});

describe("dashboard update — merge patch", () => {
  test("sends only the fields present in the file", async () => {
    const { context } = createMockContext();
    await update.call(context, { file: "d.json" }, TEST_DASHBOARD_ID, deps);
    expect(lastUpdateArgs?.patch).toEqual({ name: "Renamed" });
  });

  test("forwards the dashboard ID as a string", async () => {
    const { context } = createMockContext();
    await update.call(context, { file: "d.json" }, TEST_DASHBOARD_ID, deps);
    expect(lastUpdateArgs?.id).toBe(TEST_DASHBOARD_ID);
  });

  test("drops read-only fields so a `view --json` file round-trips", async () => {
    withFile({
      id: "999",
      createdAt: "2020-01-01T00:00:00Z",
      updatedAt: "2020-01-02T00:00:00Z",
      createdBy: { id: "1" },
      updatedBy: { id: "1" },
      managedBy: null,
      name: "Renamed",
    });
    const { context } = createMockContext();
    await update.call(context, { file: "d.json" }, TEST_DASHBOARD_ID, deps);
    expect(lastUpdateArgs?.patch).toEqual({ name: "Renamed" });
  });

  test("keeps an explicit null description, which clears the field", async () => {
    withFile({ description: null });
    const { context } = createMockContext();
    await update.call(context, { file: "d.json" }, TEST_DASHBOARD_ID, deps);
    expect(lastUpdateArgs?.patch).toEqual({ description: null });
  });

  test("sends a replacement definition as-is", async () => {
    const definition = { layout: { sections: [{ title: "A", cards: [] }] } };
    withFile({ definition });
    const { context } = createMockContext();
    await update.call(context, { file: "d.json" }, TEST_DASHBOARD_ID, deps);
    expect(lastUpdateArgs?.patch).toEqual({ definition });
  });
});

describe("dashboard update — rejected payloads", () => {
  test.each([
    "schemaVersion",
    "name",
    "visibility",
    "objectTags",
    "definition",
  ])("rejects a null %s", async (field) => {
    withFile({ [field]: null });
    const { context, stderr, getExitCode } = createMockContext();
    await update.call(context, { file: "d.json" }, TEST_DASHBOARD_ID, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain(field);
    expect(updateDashboardFn).not.toHaveBeenCalled();
  });

  test("rejects a schemaVersion other than 2", async () => {
    withFile({ schemaVersion: 3 });
    const { context, stderr, getExitCode } = createMockContext();
    await update.call(context, { file: "d.json" }, TEST_DASHBOARD_ID, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("schemaVersion");
    expect(updateDashboardFn).not.toHaveBeenCalled();
  });

  test("rejects a definition without a layout", async () => {
    withFile({ definition: { sections: [] } });
    const { context, stderr, getExitCode } = createMockContext();
    await update.call(context, { file: "d.json" }, TEST_DASHBOARD_ID, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain('"layout"');
    expect(updateDashboardFn).not.toHaveBeenCalled();
  });

  test("rejects a file with no patchable fields", async () => {
    withFile({ id: "999", createdAt: "2020-01-01T00:00:00Z" });
    const { context, stderr, getExitCode } = createMockContext();
    await update.call(context, { file: "d.json" }, TEST_DASHBOARD_ID, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("no patchable fields");
    expect(updateDashboardFn).not.toHaveBeenCalled();
  });

  test("rejects malformed JSON", async () => {
    readFileFn.mockImplementationOnce(() => "{not json");
    const { context, stderr, getExitCode } = createMockContext();
    await update.call(context, { file: "d.json" }, TEST_DASHBOARD_ID, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("--file");
    expect(updateDashboardFn).not.toHaveBeenCalled();
  });
});

describe("dashboard update — output", () => {
  test("prints the updated dashboard ID", async () => {
    const { context, stdout } = createMockContext();
    await update.call(context, { file: "d.json" }, TEST_DASHBOARD_ID, deps);
    expect(stdout.join("")).toContain(TEST_DASHBOARD_ID);
    expect(stdout.join("")).toContain("updated");
  });

  test("--json emits the updated resource and no chatter", async () => {
    const { context, stdout } = createMockContext();
    await update.call(
      context,
      { file: "d.json", json: true },
      TEST_DASHBOARD_ID,
      deps,
    );
    const parsed = JSON.parse(stdout.join("")) as DashboardResource;
    expect(parsed.id).toBe(TEST_DASHBOARD_ID);
    expect(stdout.join("")).not.toContain("Updating dashboard");
  });
});

describe("dashboard update — error handling", () => {
  test("API rejection exits 1", async () => {
    updateDashboardFn.mockImplementationOnce(() =>
      Promise.reject(new Error("dashboard not found")),
    );
    const { context, stderr, getExitCode } = createMockContext();
    await update.call(context, { file: "d.json" }, TEST_DASHBOARD_ID, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("dashboard not found");
  });

  test("loadConfig failure exits 1", async () => {
    loadConfigFn.mockImplementationOnce((): never => {
      throw new Error("no config file found");
    });
    const { context, stderr, getExitCode } = createMockContext();
    await update.call(context, { file: "d.json" }, TEST_DASHBOARD_ID, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Error");
  });
});
