import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockContext } from "../../test-helpers";
import type { Config } from "../../lib/config";
import type { RevokeIngestTokenDeps } from "./revoke";
import { revoke } from "./revoke";

const config: Config = {
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
};

const loadConfigFn = mock(() => config);
const revokeIngestTokenFn = mock(
  (
    _params: Parameters<
      NonNullable<RevokeIngestTokenDeps["revokeIngestToken"]>
    >[0],
  ) => Promise.resolve(),
);
const confirmFn = mock((_question: string) => Promise.resolve(true));

const deps: RevokeIngestTokenDeps = {
  loadConfig: loadConfigFn,
  revokeIngestToken: revokeIngestTokenFn,
  confirm: confirmFn,
};

describe("ingest-token revoke", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    revokeIngestTokenFn.mockClear();
    confirmFn.mockClear();
  });

  test("revokes the token after confirmation", async () => {
    const { context, stdout } = createMockContext();
    await revoke.call(context, {}, "ds1-token-123", deps);

    expect(confirmFn).toHaveBeenCalledTimes(1);
    expect(revokeIngestTokenFn.mock.calls[0]![0]).toEqual({
      config,
      id: "ds1-token-123",
    });
    expect(stdout.join("")).toContain("revoked");
  });

  test("--yes skips confirmation", async () => {
    const { context } = createMockContext();
    await revoke.call(context, { yes: true }, "ds1-token-123", deps);

    expect(confirmFn).not.toHaveBeenCalled();
    expect(revokeIngestTokenFn).toHaveBeenCalledTimes(1);
  });

  test("declining confirmation does not revoke", async () => {
    confirmFn.mockImplementationOnce(() => Promise.resolve(false));
    const { context, stderr, getExitCode } = createMockContext();
    await revoke.call(context, {}, "ds1-token-123", deps);

    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("cancelled");
    expect(revokeIngestTokenFn).not.toHaveBeenCalled();
  });

  test("exits with code 1 on API error", async () => {
    revokeIngestTokenFn.mockImplementationOnce(() =>
      Promise.reject(new Error("Forbidden")),
    );
    const { context, stderr, getExitCode } = createMockContext();
    await revoke.call(context, { yes: true }, "ds1-token-123", deps);

    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Forbidden");
  });
});
