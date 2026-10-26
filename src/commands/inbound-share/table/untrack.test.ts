import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../../test-helpers";
import type { getShareTable } from "../../../rest/inbound-share/get-share-table";
import type { untrackShareTable } from "../../../rest/inbound-share/untrack-share-table";
import { untrack } from "./untrack";
import { loadConfigStub, tableStub } from "../test-fixtures";
import { DatasetContentType } from "../../../rest/generated";

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
          contentType: DatasetContentType.Unknown,
        },
      },
    }),
  ),
);
const untrackFn = mock<typeof untrackShareTable>(() => Promise.resolve());

function depsWith(answer: boolean) {
  return {
    loadConfig: loadConfigStub,
    getShareTable: getFn,
    untrackShareTable: untrackFn,
    confirm: () => Promise.resolve(answer),
  };
}

describe("inbound-share table untrack", () => {
  beforeEach(() => {
    getFn.mockClear();
    untrackFn.mockClear();
  });

  test("warns that the dataset is deleted, then untracks on yes", async () => {
    const { context, stdout } = createMockContext();
    await untrack.call(
      context,
      { shareId: "41000100" },
      "41000200",
      depsWith(true),
    );
    const out = stdout.join("");
    expect(out).toContain("PUBLIC.ORDERS");
    expect(out).toContain('"Snowflake/orders"');
    expect(untrackFn.mock.calls[0]![0]).toMatchObject({
      shareId: "41000100",
      tableId: "41000200",
    });
  });

  test("aborts on no, saying so on stderr", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    await untrack.call(
      context,
      { shareId: "41000100" },
      "41000200",
      depsWith(false),
    );
    expect(untrackFn).not.toHaveBeenCalled();
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Aborted");
  });

  test("--json without --yes fails before prompting", async () => {
    const { context, stdout, stderr, getExitCode } = createMockContext();
    await untrack.call(
      context,
      { shareId: "41000100", json: true },
      "41000200",
      depsWith(true),
    );
    expect(getFn).not.toHaveBeenCalled();
    expect(untrackFn).not.toHaveBeenCalled();
    expect(getExitCode()).toBe(1);
    expect(stdout.join("")).toBe("");
    expect(stderr.join("")).toContain("--json needs --yes");
  });

  test("--yes skips the lookup and the prompt", async () => {
    const { context } = createMockContext();
    await untrack.call(
      context,
      { shareId: "41000100", yes: true },
      "41000200",
      depsWith(false),
    );
    expect(getFn).not.toHaveBeenCalled();
    expect(untrackFn).toHaveBeenCalledTimes(1);
  });
});
