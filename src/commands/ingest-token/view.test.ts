import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../test-helpers";
import type { Config } from "../../lib/config";
import type { IngestTokenResource } from "../../rest/generated";
import type { ViewIngestTokenDeps } from "./view";
import { view } from "./view";

const config: Config = {
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
};

const token: IngestTokenResource = {
  id: "ds1token123",
  name: "K8s Explorer - minikube",
  description: "Ingest token for K8s",
  disabled: false,
  createdBy: { id: "user-1" },
  createdAt: "2026-01-01T00:00:00Z",
  updatedBy: { id: "user-1" },
  updatedAt: "2026-01-01T00:00:00Z",
};

const loadConfigFn = mock(() => config);
const getIngestTokenFn = mock(
  (
    _params: Parameters<NonNullable<ViewIngestTokenDeps["getIngestToken"]>>[0],
  ) => Promise.resolve(token),
);

const deps: ViewIngestTokenDeps = {
  loadConfig: loadConfigFn,
  getIngestToken: getIngestTokenFn,
};

suppressAnsiColor();

describe("ingest-token view", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    getIngestTokenFn.mockClear();
  });

  test("gets the REST token by ID and renders a human-readable view", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, {}, "ds1token123", deps);

    expect(getIngestTokenFn.mock.calls[0]![0]).toEqual({
      config,
      id: "ds1token123",
    });
    expect(stdout.join("")).toContain("K8s Explorer - minikube");
    expect(stdout.join("")).toContain("Ingest Token");
  });

  test("--json emits the raw token without status chatter", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, { json: true }, "ds1token123", deps);

    expect(JSON.parse(stdout.join(""))).toEqual(token);
    expect(stdout.join("")).not.toContain("Fetching ingest token");
  });

  test("--format csv emits property/value rows", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, { format: "csv" }, "ds1token123", deps);

    const output = stdout.join("");
    expect(output).toContain("property,value");
    expect(output).toContain("id,ds1token123");
    expect(output).not.toContain("Fetching ingest token");
  });

  test("exits with code 1 on API error", async () => {
    getIngestTokenFn.mockImplementationOnce(() =>
      Promise.reject(new Error("Not found")),
    );
    const { context, stderr, getExitCode } = createMockContext();
    await view.call(context, {}, "bad-id", deps);

    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Not found");
  });
});
