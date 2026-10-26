import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../../test-helpers";
import type { listAllTrackedTables } from "../../../rest/inbound-share/list-all-tracked-tables";
import type { listShareTables } from "../../../rest/inbound-share/list-share-tables";
import type { listUntrackedShareTables } from "../../../rest/inbound-share/list-untracked-share-tables";
import { list } from "./list";
import { loadConfigStub, tableStub } from "../test-fixtures";
import { ExternalSharesTableKind } from "../../../rest/generated";

suppressAnsiColor();

const listFn = mock<typeof listShareTables>(() =>
  Promise.resolve({ tables: [tableStub()], meta: { totalCount: 1 } }),
);
const listUntrackedFn = mock<typeof listUntrackedShareTables>(() =>
  Promise.resolve({
    tables: [
      {
        schemaName: "PUBLIC",
        tableName: "REFUNDS",
        tableType: ExternalSharesTableKind.View,
      },
    ],
    meta: { totalCount: 1 },
  }),
);
const listAllFn = mock<typeof listAllTrackedTables>(() =>
  Promise.resolve({
    tables: [tableStub({ share: { id: "41000900" } })],
    meta: { totalCount: 1 },
  }),
);
const deps = {
  loadConfig: loadConfigStub,
  listShareTables: listFn,
  listAllTrackedTables: listAllFn,
  listUntrackedShareTables: listUntrackedFn,
};

describe("inbound-share table list", () => {
  beforeEach(() => {
    listFn.mockClear();
    listAllFn.mockClear();
    listUntrackedFn.mockClear();
  });

  test("without --share-id lists tracked tables of all shares", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 20, match: "ord" }, deps);
    expect(listFn).not.toHaveBeenCalled();
    expect(listAllFn.mock.calls[0]![0]).toMatchObject({ limit: 20 });
    expect(listAllFn.mock.calls[0]![0].filter).toContain("ord");
    const out = stdout.join("");
    expect(out).toContain("SHARE");
    expect(out).toContain("41000900");
  });

  test("--untracked without --share-id fails before calling the API", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    await list.call(context, { limit: 20, untracked: true }, deps);
    expect(listUntrackedFn).not.toHaveBeenCalled();
    expect(listAllFn).not.toHaveBeenCalled();
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("--untracked needs --share-id");
  });

  test("lists the tracked tables of --share-id", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { shareId: "41000100", limit: 20 }, deps);
    expect(listFn.mock.calls[0]![0]).toMatchObject({ shareId: "41000100" });
    expect(listUntrackedFn).not.toHaveBeenCalled();
    expect(stdout.join("")).toContain("PUBLIC.ORDERS");
  });

  test("--untracked lists the tables not tracked yet", async () => {
    const { context, stdout } = createMockContext();
    await list.call(
      context,
      { shareId: "41000100", limit: 20, untracked: true, match: "ref" },
      deps,
    );
    expect(listFn).not.toHaveBeenCalled();
    expect(listUntrackedFn.mock.calls[0]![0]).toMatchObject({
      shareId: "41000100",
      limit: 20,
    });
    expect(listUntrackedFn.mock.calls[0]![0].filter).toContain("ref");
    const out = stdout.join("");
    expect(out).toContain("PUBLIC.REFUNDS");
    expect(out).toContain("1 untracked table(s)");
  });

  test("--untracked --json prints the rows", async () => {
    const { context, stdout } = createMockContext();
    await list.call(
      context,
      { shareId: "41000100", limit: 20, untracked: true, json: true },
      deps,
    );
    expect(JSON.parse(stdout.join(""))).toEqual([
      {
        schemaName: "PUBLIC",
        tableName: "REFUNDS",
        tableType: ExternalSharesTableKind.View,
      },
    ]);
  });
});
