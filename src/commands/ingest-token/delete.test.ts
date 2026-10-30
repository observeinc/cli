import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockContext } from "../../test-helpers";
import type { Config } from "../../lib/config";
import type { DeleteIngestTokenDeps } from "./delete";
import { deleteIngestTokenCommand } from "./delete";

const config: Config = {
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
};

const loadConfigFn = mock(() => config);
const deleteIngestTokenFn = mock(
  (
    _params: Parameters<
      NonNullable<DeleteIngestTokenDeps["deleteIngestToken"]>
    >[0],
  ) => Promise.resolve(),
);
const confirmFn = mock((_question: string) => Promise.resolve(true));

const deps: DeleteIngestTokenDeps = {
  loadConfig: loadConfigFn,
  deleteIngestToken: deleteIngestTokenFn,
  confirm: confirmFn,
};

describe("ingest-token delete", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    deleteIngestTokenFn.mockClear();
    confirmFn.mockClear();
  });

  test("deletes the token after confirmation", async () => {
    const { context, stdout } = createMockContext();
    await deleteIngestTokenCommand.call(context, {}, "ds1token123", deps);

    expect(confirmFn).toHaveBeenCalledTimes(1);
    expect(deleteIngestTokenFn.mock.calls[0]![0]).toEqual({
      config,
      id: "ds1token123",
    });
    expect(stdout.join("")).toContain("deleted");
  });

  test("--yes skips confirmation", async () => {
    const { context } = createMockContext();
    await deleteIngestTokenCommand.call(
      context,
      { yes: true },
      "ds1token123",
      deps,
    );

    expect(confirmFn).not.toHaveBeenCalled();
    expect(deleteIngestTokenFn).toHaveBeenCalledTimes(1);
  });

  test("declining confirmation does not delete", async () => {
    confirmFn.mockImplementationOnce(() => Promise.resolve(false));
    const { context, stderr, getExitCode } = createMockContext();
    await deleteIngestTokenCommand.call(context, {}, "ds1token123", deps);

    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("cancelled");
    expect(deleteIngestTokenFn).not.toHaveBeenCalled();
  });

  test("exits with code 1 on API error", async () => {
    deleteIngestTokenFn.mockImplementationOnce(() =>
      Promise.reject(new Error("Forbidden")),
    );
    const { context, stderr, getExitCode } = createMockContext();
    await deleteIngestTokenCommand.call(
      context,
      { yes: true },
      "ds1token123",
      deps,
    );

    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Forbidden");
  });
});
