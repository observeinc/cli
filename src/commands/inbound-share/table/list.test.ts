import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../../test-helpers";
import type { listShareTables } from "../../../rest/inbound-share/list-share-tables";
import type { listUntrackedShareTables } from "../../../rest/inbound-share/list-untracked-share-tables";
import { list } from "./list";
import { loadConfigStub, tableStub } from "../test-fixtures";

suppressAnsiColor();

const listFn = mock<typeof listShareTables>(() =>
  Promise.resolve({ tables: [tableStub()], meta: { totalCount: 1 } }),
);
const listUntrackedFn = mock<typeof listUntrackedShareTables>(() =>
  Promise.resolve({
    tables: [{ schemaName: "PUBLIC", tableName: "REFUNDS", tableType: "View" }],
    meta: { totalCount: 1 },
  }),
);
const deps = {
  loadConfig: loadConfigStub,
  listShareTables: listFn,
  listUntrackedShareTables: listUntrackedFn,
};

describe("inbound-share table list", () => {
  beforeEach(() => {
    listFn.mockClear();
    listUntrackedFn.mockClear();
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
      { schemaName: "PUBLIC", tableName: "REFUNDS", tableType: "View" },
    ]);
  });
});
