import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../test-helpers";
import type { listShares } from "../../rest/share-in/list-shares";
import { list } from "./list";
import { loadConfigStub, shareStub } from "./test-fixtures";

suppressAnsiColor();

const listFn = mock<typeof listShares>(() =>
  Promise.resolve({ shares: [shareStub()], meta: { totalCount: 1 } }),
);
const deps = { loadConfig: loadConfigStub, listShares: listFn };

describe("share-in list", () => {
  beforeEach(() => {
    listFn.mockClear();
  });

  test("maps --state and --health to the API's query params", async () => {
    const { context } = createMockContext();
    await list.call(
      context,
      { state: "Active", health: "Unhealthy", limit: 50 },
      deps,
    );
    expect(listFn.mock.calls[0]![0]).toMatchObject({
      status: "Active",
      healthStatus: "Unhealthy",
      limit: 50,
    });
  });

  test("renders a table by default", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 100 }, deps);
    const out = stdout.join("");
    expect(out).toContain("Orders share");
    expect(out).toContain("ACME.PROD");
    expect(out).toContain("Healthy");
  });

  test("emits JSON with --json", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { json: true, limit: 100 }, deps);
    const payload = JSON.parse(stdout.join("")) as { id: string }[];
    expect(payload[0]!.id).toBe("41000100");
  });
});
