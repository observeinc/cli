import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../test-helpers";
import type { deleteShare } from "../../rest/share-in/delete-share";
import type { getShare } from "../../rest/share-in/get-share";
import { remove } from "./delete";
import { apiError, loadConfigStub, shareStub } from "./test-fixtures";

suppressAnsiColor();

const getFn = mock<typeof getShare>(() => Promise.resolve(shareStub()));
const deleteFn = mock<typeof deleteShare>(() => Promise.resolve());

function depsWith(answer: boolean) {
  return {
    loadConfig: loadConfigStub,
    getShare: getFn,
    deleteShare: deleteFn,
    confirm: () => Promise.resolve(answer),
  };
}

describe("share-in delete", () => {
  beforeEach(() => {
    getFn.mockClear();
    deleteFn.mockClear();
  });

  test("asks for confirmation and deletes on yes", async () => {
    const { context, stdout } = createMockContext();
    await remove.call(context, {}, "41000100", depsWith(true));
    expect(getFn).toHaveBeenCalledTimes(1);
    expect(deleteFn.mock.calls[0]![0]).toMatchObject({
      shareId: "41000100",
      force: undefined,
    });
    expect(stdout.join("")).toContain("Deleted share");
  });

  test("aborts on no without deleting, saying so on stderr", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    await remove.call(context, {}, "41000100", depsWith(false));
    expect(deleteFn).not.toHaveBeenCalled();
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Aborted");
  });

  test("--json without --yes fails before prompting", async () => {
    const { context, stdout, stderr, getExitCode } = createMockContext();
    await remove.call(context, { json: true }, "41000100", depsWith(true));
    expect(getFn).not.toHaveBeenCalled();
    expect(deleteFn).not.toHaveBeenCalled();
    expect(getExitCode()).toBe(1);
    expect(stdout.join("")).toBe("");
    expect(stderr.join("")).toContain("--json needs --yes");
  });

  test("--json --yes prints only the JSON result", async () => {
    const { context, stdout } = createMockContext();
    await remove.call(
      context,
      { json: true, yes: true },
      "41000100",
      depsWith(false),
    );
    expect(JSON.parse(stdout.join(""))).toEqual({
      success: true,
      id: "41000100",
    });
  });

  test("--force is separate from --yes and warns", async () => {
    const { context, stdout } = createMockContext();
    await remove.call(
      context,
      { yes: true, force: true },
      "41000100",
      depsWith(false),
    );
    expect(getFn).not.toHaveBeenCalled();
    expect(deleteFn.mock.calls[0]![0].force).toBe(true);
    expect(stdout.join("")).toContain("untracks every table");
  });

  test("points to --force when tables are still tracked", async () => {
    deleteFn.mockImplementationOnce(() =>
      Promise.reject(
        apiError(409, "share_has_tracked_tables", "share has tracked tables"),
      ),
    );
    const { context, stderr, getExitCode } = createMockContext();
    await remove.call(context, { yes: true }, "41000100", depsWith(true));
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("--force");
  });
});
