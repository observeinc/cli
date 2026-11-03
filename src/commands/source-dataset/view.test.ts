import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../test-helpers";
import type { getSourceDataset } from "../../rest/source-dataset/get-source-dataset";
import { view } from "./view";
import { apiError, loadConfigStub, sourceDatasetStub } from "./test-fixtures";

suppressAnsiColor();

const getFn = mock<typeof getSourceDataset>(() =>
  Promise.resolve(sourceDatasetStub()),
);
const deps = { loadConfig: loadConfigStub, getSourceDataset: getFn };

describe("source-dataset view", () => {
  beforeEach(() => {
    getFn.mockClear();
  });

  test("passes the id and --expand", async () => {
    const { context } = createMockContext();
    await view.call(context, { expand: true, json: true }, "41000001", deps);
    const [args] = getFn.mock.calls[0]!;
    expect(args).toMatchObject({ id: "41000001", expand: true });
  });

  test("renders label, description and type by default", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, {}, "41000001", deps);
    const out = stdout.join("");
    expect(out).toContain("Logs/checkout");
    expect(out).toContain("checkout logs");
    expect(out).toContain("OtelLogs");
  });

  test("shows the one-hour totals, not the per-minute series", async () => {
    getFn.mockImplementationOnce(() =>
      Promise.resolve(
        sourceDatasetStub({
          ingestStats: {
            observations: [{ time: "2026-10-23T10:00:00Z", value: 7 }],
            volumeBytes: [{ time: "2026-10-23T10:00:00Z", value: 512 }],
            observationsLastHour: 4242,
            bytesLastHour: 99999,
            firstIngest: "2026-10-01T00:00:00Z",
            lastIngest: "2026-10-23T10:00:00Z",
          },
        }),
      ),
    );
    const { context, stdout } = createMockContext();
    await view.call(context, { expand: true }, "41000001", deps);
    const out = stdout.join("");
    expect(out).toContain("4242");
    expect(out).toContain("99999");
    expect(out).not.toContain("512");
  });

  test("gives a not-found message on 404", async () => {
    getFn.mockImplementationOnce(() =>
      Promise.reject(apiError(404, "not_found", "nope")),
    );
    const { context, stderr, getExitCode } = createMockContext();
    await view.call(context, {}, "9", deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Source dataset not found: 9");
  });
});
