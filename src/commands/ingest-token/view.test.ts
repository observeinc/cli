import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockContext } from "../../test-helpers";
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
  id: "ds1-token-123",
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

describe("ingest-token view", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    getIngestTokenFn.mockClear();
  });

  test("gets the REST token by ID and outputs it", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, {}, "ds1-token-123", deps);

    expect(getIngestTokenFn.mock.calls[0]![0]).toEqual({
      config,
      id: "ds1-token-123",
    });
    expect(JSON.parse(stdout.join(""))).toEqual(token);
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
