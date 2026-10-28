import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockContext } from "../../test-helpers";
import type { Config } from "../../lib/config";
import type { IngestTokenResource } from "../../rest/generated";
import type { ListIngestTokenDeps } from "./list";
import { list } from "./list";

const config: Config = {
  customerId: "test-customer",
  token: "test-token",
  domain: "observeinc.com",
};

function token(id: string, name: string): IngestTokenResource {
  return {
    id,
    name,
    description: "",
    disabled: false,
    createdBy: { id: "user-1" },
    createdAt: "2026-01-01T00:00:00Z",
    updatedBy: { id: "user-1" },
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

const loadConfigFn = mock(() => config);
const listIngestTokensFn = mock(
  (
    _params: Parameters<
      NonNullable<ListIngestTokenDeps["listIngestTokens"]>
    >[0],
  ) =>
    Promise.resolve({
      tokens: [
        token("ds1-token-1", "Token A"),
        token("ds1-token-2", "Token B"),
      ],
      meta: { totalCount: 2 },
    }),
);

const deps: ListIngestTokenDeps = {
  loadConfig: loadConfigFn,
  listIngestTokens: listIngestTokensFn,
};

describe("ingest-token list", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    listIngestTokensFn.mockClear();
  });

  test("returns all tokens", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, {}, deps);

    expect(listIngestTokensFn).toHaveBeenCalledTimes(1);
    expect(listIngestTokensFn.mock.calls[0]![0]).toMatchObject({
      config,
      offset: 0,
      limit: 100,
    });
    expect(JSON.parse(stdout.join(""))).toHaveLength(2);
  });

  test("sends a safe case-insensitive name filter", async () => {
    const { context } = createMockContext();
    await list.call(context, { match: 'Token "A"' }, deps);

    expect(listIngestTokensFn.mock.calls[0]![0].filter).toBe(
      String.raw`name.matches("(?i)Token \"A\"")`,
    );
  });

  test("pages until all tokens are returned", async () => {
    const firstPage = Array.from({ length: 100 }, (_, i) =>
      token(`ds1-${i}`, `Token ${i}`),
    );
    listIngestTokensFn
      .mockImplementationOnce(() =>
        Promise.resolve({ tokens: firstPage, meta: { totalCount: 101 } }),
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          tokens: [token("ds1-100", "Token 100")],
          meta: { totalCount: 101 },
        }),
      );

    const { context, stdout } = createMockContext();
    await list.call(context, {}, deps);

    expect(listIngestTokensFn).toHaveBeenCalledTimes(2);
    expect(listIngestTokensFn.mock.calls[1]![0].offset).toBe(100);
    expect(JSON.parse(stdout.join(""))).toHaveLength(101);
  });

  test("continues after a short page when the total count is unknown", async () => {
    const firstPage = [token("ds1-1", "Token 1"), token("ds1-2", "Token 2")];
    listIngestTokensFn
      .mockImplementationOnce(() =>
        Promise.resolve({ tokens: firstPage, meta: { totalCount: -1 } }),
      )
      .mockImplementationOnce(() =>
        Promise.resolve({ tokens: [], meta: { totalCount: -1 } }),
      );

    const { context, stdout } = createMockContext();
    await list.call(context, {}, deps);

    expect(listIngestTokensFn).toHaveBeenCalledTimes(2);
    expect(listIngestTokensFn.mock.calls[1]![0].offset).toBe(2);
    expect(JSON.parse(stdout.join(""))).toEqual(firstPage);
  });

  test("exits with code 1 on API error", async () => {
    listIngestTokensFn.mockImplementationOnce(() =>
      Promise.reject(new Error("Server error")),
    );
    const { context, stderr, getExitCode } = createMockContext();
    await list.call(context, {}, deps);

    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Server error");
  });
});
