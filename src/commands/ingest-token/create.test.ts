import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockContext } from "../../test-helpers";
import type { Config } from "../../lib/config";
import type { IngestTokenCreateResponse } from "../../rest/generated";
import type { CreateIngestTokenDeps } from "./create";
import { create } from "./create";

const config: Config = {
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
};

const token: IngestTokenCreateResponse = {
  id: "ds1-token-789",
  name: "k8s-ingest",
  description: "",
  disabled: false,
  secret: "ds1-token-789:secret-abc-xyz",
  createdBy: { id: "user-1" },
  createdAt: "2026-01-01T00:00:00Z",
  updatedBy: { id: "user-1" },
  updatedAt: "2026-01-01T00:00:00Z",
};

const loadConfigFn = mock(() => config);
const createIngestTokenFn = mock(
  (
    _params: Parameters<
      NonNullable<CreateIngestTokenDeps["createIngestToken"]>
    >[0],
  ) => Promise.resolve(token),
);

const deps: CreateIngestTokenDeps = {
  loadConfig: loadConfigFn,
  createIngestToken: createIngestTokenFn,
};

describe("ingest-token create", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    createIngestTokenFn.mockClear();
  });

  test("creates a token through the REST backend", async () => {
    const { context, stdout } = createMockContext();
    await create.call(
      context,
      { name: "k8s-ingest", description: "Kubernetes ingest" },
      deps,
    );

    expect(createIngestTokenFn).toHaveBeenCalledTimes(1);
    expect(createIngestTokenFn.mock.calls[0]![0]).toEqual({
      config,
      ingestTokenCreateRequest: {
        name: "k8s-ingest",
        description: "Kubernetes ingest",
      },
    });
    expect(JSON.parse(stdout.join(""))).toEqual(token);
  });

  test("allows the API to generate a name", async () => {
    const { context } = createMockContext();
    await create.call(context, {}, deps);

    expect(
      createIngestTokenFn.mock.calls[0]![0].ingestTokenCreateRequest.name,
    ).toBeUndefined();
  });

  test("exits with code 1 on API error", async () => {
    createIngestTokenFn.mockImplementationOnce(() =>
      Promise.reject(new Error("Server error")),
    );
    const { context, stderr, getExitCode } = createMockContext();
    await create.call(context, { name: "fail" }, deps);

    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Server error");
  });
});
