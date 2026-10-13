import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../test-helpers";
import type { deleteSourceDataset } from "../../rest/source-dataset/delete-source-dataset";
import type { getSourceDataset } from "../../rest/source-dataset/get-source-dataset";
import { remove } from "./delete";
import { apiError, loadConfigStub, sourceDatasetStub } from "./test-fixtures";

suppressAnsiColor();

const getFn = mock<typeof getSourceDataset>(() =>
  Promise.resolve(sourceDatasetStub()),
);
const deleteFn = mock<typeof deleteSourceDataset>(() => Promise.resolve());

function depsWith(answer: boolean) {
  return {
    loadConfig: loadConfigStub,
    getSourceDataset: getFn,
    deleteSourceDataset: deleteFn,
    confirm: () => Promise.resolve(answer),
  };
}

describe("source-dataset delete", () => {
  beforeEach(() => {
    getFn.mockClear();
    deleteFn.mockClear();
  });

  test("asks for confirmation and deletes on yes", async () => {
    const { context, stdout } = createMockContext();
    await remove.call(context, {}, "41000001", depsWith(true));
    expect(getFn).toHaveBeenCalledTimes(1);
    expect(deleteFn.mock.calls[0]![0]).toMatchObject({
      id: "41000001",
      force: undefined,
    });
    expect(stdout.join("")).toContain("Deleted source dataset");
  });

  test("aborts on no without deleting", async () => {
    const { context, getExitCode } = createMockContext();
    await remove.call(context, {}, "41000001", depsWith(false));
    expect(deleteFn).not.toHaveBeenCalled();
    expect(getExitCode()).toBe(1);
  });

  test("--yes skips the prompt and does not force", async () => {
    const { context } = createMockContext();
    await remove.call(context, { yes: true }, "41000001", depsWith(false));
    expect(getFn).not.toHaveBeenCalled();
    expect(deleteFn.mock.calls[0]![0].force).toBeUndefined();
  });

  test("--force is separate from --yes and warns", async () => {
    const { context, stdout } = createMockContext();
    await remove.call(
      context,
      { yes: true, force: true },
      "41000001",
      depsWith(false),
    );
    expect(deleteFn.mock.calls[0]![0].force).toBe(true);
    expect(stdout.join("")).toContain("dashboards and worksheets");
  });

  test("passes an ingest token 409 through", async () => {
    deleteFn.mockImplementationOnce(() =>
      Promise.reject(
        apiError(
          409,
          "ingest_token_active",
          "an enabled ingest token sends here",
        ),
      ),
    );
    const { context, stderr, getExitCode } = createMockContext();
    await remove.call(context, { yes: true }, "41000001", depsWith(true));
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("an enabled ingest token sends here");
  });
});
