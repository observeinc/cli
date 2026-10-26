import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../../test-helpers";
import type { getUntrackedTableSchema } from "../../../rest/inbound-share/get-untracked-table-schema";
import { schema } from "./schema";
import { apiError, loadConfigStub } from "../test-fixtures";

suppressAnsiColor();

const columns = [
  { name: "ID", type: "NUMBER", nullable: false },
  { name: "CREATED_AT", type: "TIMESTAMP_NTZ", nullable: true },
];
const getFn = mock<typeof getUntrackedTableSchema>(() =>
  Promise.resolve({ columns }),
);
const deps = { loadConfig: loadConfigStub, getUntrackedTableSchema: getFn };

describe("inbound-share table schema", () => {
  beforeEach(() => {
    getFn.mockClear();
  });

  test("renders the columns of the untracked table", async () => {
    const { context, stdout } = createMockContext();
    await schema.call(
      context,
      { shareId: "41000100", schema: "PUBLIC", table: "REFUNDS" },
      deps,
    );
    expect(getFn.mock.calls[0]![0]).toMatchObject({
      shareId: "41000100",
      schemaName: "PUBLIC",
      tableName: "REFUNDS",
    });
    const out = stdout.join("");
    expect(out).toContain("PUBLIC.REFUNDS");
    expect(out).toContain("CREATED_AT");
    expect(out).toContain("TIMESTAMP_NTZ");
  });

  test("--json prints the columns", async () => {
    const { context, stdout } = createMockContext();
    await schema.call(
      context,
      { shareId: "41000100", schema: "PUBLIC", table: "REFUNDS", json: true },
      deps,
    );
    expect(JSON.parse(stdout.join(""))).toEqual(columns);
  });

  test("names the table on 404", async () => {
    getFn.mockImplementationOnce(() =>
      Promise.reject(apiError(404, "not_found", "table not found")),
    );
    const { context, stderr, getExitCode } = createMockContext();
    await schema.call(
      context,
      { shareId: "41000100", schema: "PUBLIC", table: "NOPE" },
      deps,
    );
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain(
      "Share or untracked table not found: PUBLIC.NOPE in share 41000100",
    );
    expect(stderr.join("")).toContain("(HTTP 404: table not found)");
  });

  test("shell-quotes names in the track hint", async () => {
    const { context, stdout, stderr } = createMockContext();
    await schema.call(
      context,
      { shareId: "41000100", schema: "PUBLIC", table: "Order Items" },
      deps,
    );
    expect(stdout.join("") + stderr.join("")).toContain(
      "--schema PUBLIC --table 'Order Items'",
    );
  });
});
