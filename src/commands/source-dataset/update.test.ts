import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../test-helpers";
import type { updateSourceDataset } from "../../rest/source-dataset/update-source-dataset";
import { update } from "./update";
import { apiError, loadConfigStub, sourceDatasetStub } from "./test-fixtures";

suppressAnsiColor();

const updateFn = mock<typeof updateSourceDataset>(() =>
  Promise.resolve(sourceDatasetStub({ label: "Logs/checkout-v2" })),
);
const deps = { loadConfig: loadConfigStub, updateSourceDataset: updateFn };

describe("source-dataset update", () => {
  beforeEach(() => {
    updateFn.mockClear();
  });

  test("sends a merge-patch body with clears as null", async () => {
    const { context, stdout } = createMockContext();
    await update.call(
      context,
      { label: "Logs/checkout-v2", clearDescription: true },
      "41000001",
      deps,
    );
    expect(updateFn.mock.calls[0]![0]).toMatchObject({
      id: "41000001",
      body: { label: "Logs/checkout-v2", description: null },
    });
    expect(stdout.join("")).toContain("Logs/checkout-v2");
  });

  test("exits 1 without calling the API when nothing is passed", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    await update.call(context, {}, "41000001", deps);
    expect(getExitCode()).toBe(1);
    expect(updateFn).not.toHaveBeenCalled();
    expect(stderr.join("")).toContain("Nothing to update");
  });

  test("passes a package change 400 through with the server message", async () => {
    updateFn.mockImplementationOnce(() =>
      Promise.reject(
        apiError(400, "package_immutable", "the package cannot change"),
      ),
    );
    const { context, stderr } = createMockContext();
    await update.call(context, { label: "Other/name" }, "41000001", deps);
    expect(stderr.join("")).toContain("the package cannot change");
  });
});
