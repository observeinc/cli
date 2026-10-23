import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../../test-helpers";
import type { attachTableDataset } from "../../../rest/inbound-share/attach-table-dataset";
import { attach } from "./attach";
import { apiError, loadConfigStub, tableStub } from "../test-fixtures";

suppressAnsiColor();

const attachFn = mock<typeof attachTableDataset>(() =>
  Promise.resolve(tableStub()),
);
const deps = { loadConfig: loadConfigStub, attachTableDataset: attachFn };

describe("inbound-share table attach", () => {
  beforeEach(() => {
    attachFn.mockClear();
  });

  test("sends the dataset spec for the table", async () => {
    const { context, stdout } = createMockContext();
    await attach.call(
      context,
      {
        shareId: "41000100",
        datasetLabel: "Snowflake/orders",
        kind: "Event",
        validFrom: "CREATED_AT",
      },
      "41000200",
      deps,
    );
    expect(attachFn.mock.calls[0]![0]).toMatchObject({
      shareId: "41000100",
      tableId: "41000200",
      body: {
        dataset: {
          label: "Snowflake/orders",
          kind: "Event",
          validFromField: "CREATED_AT",
        },
      },
    });
    const out = stdout.join("");
    expect(out).toContain("41000300");
    expect(out).toContain("PUBLIC.ORDERS");
  });

  test("checks the timestamp fields against --kind before calling the API", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    await attach.call(
      context,
      { shareId: "41000100", datasetLabel: "x", kind: "Event" },
      "41000200",
      deps,
    );
    expect(attachFn).not.toHaveBeenCalled();
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("--kind Event needs --valid-from");
  });

  test("reports a table that already has a dataset", async () => {
    attachFn.mockImplementationOnce(() =>
      Promise.reject(
        apiError(409, "conflict", "table already has an attached dataset"),
      ),
    );
    const { context, stderr, getExitCode } = createMockContext();
    await attach.call(
      context,
      { shareId: "41000100", datasetLabel: "x", kind: "Table" },
      "41000200",
      deps,
    );
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("already has an attached dataset");
  });
});
