import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockContext } from "../../test-helpers";
import type { Config } from "../../lib/config";
import type { IngestTokenResource } from "../../rest/generated";
import type { UpdateIngestTokenDeps } from "./update";
import { update } from "./update";

const config: Config = {
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
};

const updatedToken: IngestTokenResource = {
  id: "ds1-token-123",
  name: "Updated Token",
  description: "New description",
  disabled: false,
  createdBy: { id: "user-1" },
  createdAt: "2026-01-01T00:00:00Z",
  updatedBy: { id: "user-1" },
  updatedAt: "2026-01-02T00:00:00Z",
};

const loadConfigFn = mock(() => config);
const updateIngestTokenFn = mock(
  (
    _params: Parameters<
      NonNullable<UpdateIngestTokenDeps["updateIngestToken"]>
    >[0],
  ) => Promise.resolve(updatedToken),
);

const deps: UpdateIngestTokenDeps = {
  loadConfig: loadConfigFn,
  updateIngestToken: updateIngestTokenFn,
};

describe("ingest-token update", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    updateIngestTokenFn.mockClear();
  });

  test("sends only the fields provided to the REST merge-patch", async () => {
    const { context, stdout } = createMockContext();
    await update.call(
      context,
      { name: "Updated Token", description: "New description" },
      "ds1-token-123",
      deps,
    );

    expect(updateIngestTokenFn.mock.calls[0]![0]).toEqual({
      config,
      id: "ds1-token-123",
      ingestTokenUpdateRequest: {
        name: "Updated Token",
        description: "New description",
      },
    });
    expect(JSON.parse(stdout.join(""))).toEqual(updatedToken);
  });

  test("passes an explicit false disabled value", async () => {
    const { context } = createMockContext();
    await update.call(context, { disabled: false }, "ds1-token-123", deps);

    expect(
      updateIngestTokenFn.mock.calls[0]![0].ingestTokenUpdateRequest.disabled,
    ).toBe(false);
  });

  test("exits with code 1 when no editable field is provided", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    await update.call(context, {}, "ds1-token-123", deps);

    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Nothing to update");
    expect(updateIngestTokenFn).not.toHaveBeenCalled();
  });

  test("exits with code 1 on API error", async () => {
    updateIngestTokenFn.mockImplementationOnce(() =>
      Promise.reject(new Error("Forbidden")),
    );
    const { context, stderr, getExitCode } = createMockContext();
    await update.call(context, { name: "fail" }, "ds1-token-123", deps);

    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Forbidden");
  });
});
