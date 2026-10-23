import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../../test-helpers";
import type { getShareTable } from "../../../rest/inbound-share/get-share-table";
import type { detachTableDataset } from "../../../rest/inbound-share/detach-table-dataset";
import { detach } from "./detach";
import { loadConfigStub, tableStub } from "../test-fixtures";

suppressAnsiColor();

const getFn = mock<typeof getShareTable>(() =>
  Promise.resolve(
    tableStub({
      sourceDataset: {
        id: "41000300",
        record: {
          label: "Snowflake/orders",
          description: "",
          iconUrl: "",
          contentType: "",
        },
      },
    }),
  ),
);
const detachFn = mock<typeof detachTableDataset>(() => Promise.resolve());

function depsWith(answer: boolean) {
  return {
    loadConfig: loadConfigStub,
    getShareTable: getFn,
    detachTableDataset: detachFn,
    confirm: () => Promise.resolve(answer),
  };
}

describe("inbound-share table detach", () => {
  beforeEach(() => {
    getFn.mockClear();
    detachFn.mockClear();
  });

  test("warns that the dataset is deleted, then detaches on yes", async () => {
    const { context, stdout } = createMockContext();
    await detach.call(
      context,
      { shareId: "41000100" },
      "41000200",
      depsWith(true),
    );
    const out = stdout.join("");
    expect(out).toContain('"Snowflake/orders"');
    expect(out).toContain("stays tracked");
    expect(detachFn.mock.calls[0]![0]).toMatchObject({
      shareId: "41000100",
      tableId: "41000200",
    });
  });

  test("aborts on no", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    await detach.call(
      context,
      { shareId: "41000100" },
      "41000200",
      depsWith(false),
    );
    expect(detachFn).not.toHaveBeenCalled();
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Aborted");
  });

  test("--json without --yes fails before prompting", async () => {
    const { context, stdout, stderr, getExitCode } = createMockContext();
    await detach.call(
      context,
      { shareId: "41000100", json: true },
      "41000200",
      depsWith(true),
    );
    expect(getFn).not.toHaveBeenCalled();
    expect(detachFn).not.toHaveBeenCalled();
    expect(getExitCode()).toBe(1);
    expect(stdout.join("")).toBe("");
    expect(stderr.join("")).toContain("--json needs --yes");
  });

  test("--yes --json skips the prompt and prints the result", async () => {
    const { context, stdout } = createMockContext();
    await detach.call(
      context,
      { shareId: "41000100", yes: true, json: true },
      "41000200",
      depsWith(false),
    );
    expect(getFn).not.toHaveBeenCalled();
    expect(JSON.parse(stdout.join(""))).toEqual({
      success: true,
      id: "41000200",
    });
  });
});
