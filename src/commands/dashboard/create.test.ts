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
  DashboardCreateRequest,
  DashboardResource,
} from "../../rest/generated";
import { dashboardStub, loadConfigStub, readFileStub } from "./test-fixtures";
import type { CreateDashboardDeps } from "./create";

const loadConfigFn = loadConfigStub();

const { readFile: readFileFn, withFile } = readFileStub({
  name: "My Dashboard",
  definition: { layout: { sections: [] } },
});

interface CreateArgs {
  config: Config;
  dashboard: DashboardCreateRequest;
}

let lastCreateArgs: CreateArgs | undefined;

const createDashboardFn = mock(
  (args: CreateArgs): Promise<DashboardResource> => {
    lastCreateArgs = args;
    return Promise.resolve(dashboardStub({ id: "43183689" }));
  },
);

let create: (typeof import("./create"))["create"];

const deps: CreateDashboardDeps = {
  loadConfig: loadConfigFn,
  createDashboard: createDashboardFn,
  readFile: readFileFn,
};

suppressAnsiColor();

beforeAll(async () => {
  const mod = await import("./create.ts");
  create = mod.create;
});

afterAll(() => {
  mock.restore();
});

beforeEach(() => {
  createDashboardFn.mockClear();
  readFileFn.mockClear();
  lastCreateArgs = undefined;
});

describe("dashboard create — file validation", () => {
  test("rejects a file without a name", async () => {
    withFile({ definition: { layout: {} } });
    const { context, stderr, getExitCode } = createMockContext();
    await create.call(context, { file: "d.json" }, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain('"name"');
    expect(createDashboardFn).not.toHaveBeenCalled();
  });

  test("rejects an empty name", async () => {
    withFile({ name: "", definition: { layout: {} } });
    const { context, getExitCode } = createMockContext();
    await create.call(context, { file: "d.json" }, deps);
    expect(getExitCode()).toBe(1);
    expect(createDashboardFn).not.toHaveBeenCalled();
  });

  test("ignores schemaVersion from the file", async () => {
    withFile({ schemaVersion: 1, name: "x", definition: { layout: {} } });
    const { context } = createMockContext();
    await create.call(context, { file: "d.json" }, deps);
    expect(lastCreateArgs?.dashboard.schemaVersion).toBe(2);
  });

  test("rejects a missing definition", async () => {
    withFile({ name: "x" });
    const { context, stderr, getExitCode } = createMockContext();
    await create.call(context, { file: "d.json" }, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain('"definition"');
    expect(createDashboardFn).not.toHaveBeenCalled();
  });

  test("rejects a definition without a layout", async () => {
    withFile({ name: "x", definition: {} });
    const { context, stderr, getExitCode } = createMockContext();
    await create.call(context, { file: "d.json" }, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain('"layout"');
    expect(createDashboardFn).not.toHaveBeenCalled();
  });

  test("rejects malformed JSON", async () => {
    readFileFn.mockImplementationOnce(() => "{not json");
    const { context, stderr, getExitCode } = createMockContext();
    await create.call(context, { file: "d.json" }, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("--file");
    expect(createDashboardFn).not.toHaveBeenCalled();
  });
});

describe("dashboard create — request body", () => {
  test("sends schemaVersion, name, and definition", async () => {
    const { context } = createMockContext();
    await create.call(context, { file: "d.json" }, deps);
    expect(lastCreateArgs?.dashboard).toMatchObject({
      schemaVersion: 2,
      name: "My Dashboard",
      definition: { layout: { sections: [] } },
    });
  });

  test("omits optional fields that the file does not set", async () => {
    const { context } = createMockContext();
    await create.call(context, { file: "d.json" }, deps);
    const body = lastCreateArgs!.dashboard;
    expect(Object.hasOwn(body, "description")).toBe(false);
    expect(Object.hasOwn(body, "visibility")).toBe(false);
    expect(Object.hasOwn(body, "objectTags")).toBe(false);
  });

  test("forwards optional fields when the file sets them", async () => {
    withFile({
      schemaVersion: 2,
      name: "x",
      description: "desc",
      visibility: "Hidden",
      objectTags: { env: ["prod"] },
      definition: { layout: {} },
    });
    const { context } = createMockContext();
    await create.call(context, { file: "d.json" }, deps);
    expect(lastCreateArgs?.dashboard).toMatchObject({
      description: "desc",
      visibility: "Hidden",
      objectTags: { env: ["prod"] },
    });
  });

  test("drops server-assigned fields present in the file", async () => {
    withFile({
      id: "999",
      createdAt: "2020-01-01T00:00:00Z",
      createdBy: { id: "1" },
      schemaVersion: 2,
      name: "x",
      definition: { layout: {} },
    });
    const { context } = createMockContext();
    await create.call(context, { file: "d.json" }, deps);
    const body = lastCreateArgs!.dashboard;
    expect(Object.hasOwn(body, "id")).toBe(false);
    expect(Object.hasOwn(body, "createdAt")).toBe(false);
    expect(Object.hasOwn(body, "createdBy")).toBe(false);
  });
});

describe("dashboard create — output", () => {
  test("prints the new dashboard ID on success", async () => {
    const { context, stdout } = createMockContext();
    await create.call(context, { file: "d.json" }, deps);
    expect(stdout.join("")).toContain("43183689");
    expect(stdout.join("")).toContain("created");
  });

  test("--json emits the created resource and no chatter", async () => {
    const { context, stdout } = createMockContext();
    await create.call(context, { file: "d.json", json: true }, deps);
    const parsed = JSON.parse(stdout.join("")) as DashboardResource;
    expect(parsed.id).toBe("43183689");
    expect(stdout.join("")).not.toContain("Creating dashboard");
  });
});

describe("dashboard create — error handling", () => {
  test("API rejection exits 1", async () => {
    createDashboardFn.mockImplementationOnce(() =>
      Promise.reject(new Error("invalid definition")),
    );
    const { context, stderr, getExitCode } = createMockContext();
    await create.call(context, { file: "d.json" }, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("invalid definition");
  });

  test("unreadable file exits 1", async () => {
    readFileFn.mockImplementationOnce((): never => {
      throw new Error("ENOENT: no such file");
    });
    const { context, stderr, getExitCode } = createMockContext();
    await create.call(context, { file: "missing.json" }, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("ENOENT");
    expect(createDashboardFn).not.toHaveBeenCalled();
  });
});
