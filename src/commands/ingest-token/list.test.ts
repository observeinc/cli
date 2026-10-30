import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../test-helpers";
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
    updatedAt: "2026-01-02T00:00:00Z",
  };
}

const tokens = [
  token("ds1token1", "Token A"),
  {
    ...token("ds1token2", "Token B"),
    stats: {
      firstUsed: "2026-01-03T00:00:00Z",
      lastUsed: "2026-01-04T00:00:00Z",
      firstIngest: "2026-01-03T00:00:00Z",
      lastIngest: "2026-01-04T00:00:00Z",
      errors: [],
      observations: [],
      volumeBytes: [],
    },
  },
];

const loadConfigFn = mock(() => config);
const listIngestTokensFn = mock(
  (
    _params: Parameters<
      NonNullable<ListIngestTokenDeps["listIngestTokens"]>
    >[0],
  ) => Promise.resolve({ tokens, meta: { totalCount: 12 } }),
);

const deps: ListIngestTokenDeps = {
  loadConfig: loadConfigFn,
  listIngestTokens: listIngestTokensFn,
};

suppressAnsiColor();

describe("ingest-token list", () => {
  beforeEach(() => {
    loadConfigFn.mockClear();
    listIngestTokensFn.mockClear();
  });

  test("forwards pagination and expansion parameters", async () => {
    const { context } = createMockContext();
    await list.call(
      context,
      { limit: 25, offset: 50, expand: true, json: true },
      deps,
    );

    expect(listIngestTokensFn).toHaveBeenCalledTimes(1);
    expect(listIngestTokensFn.mock.calls[0]![0]).toMatchObject({
      config,
      offset: 50,
      limit: 25,
      expand: true,
    });
  });

  test("sends a safe case-insensitive name filter", async () => {
    const { context } = createMockContext();
    await list.call(
      context,
      { limit: 100, match: 'Token "A"', json: true },
      deps,
    );

    expect(listIngestTokensFn.mock.calls[0]![0].filter).toBe(
      String.raw`name.matches("(?i)Token \"A\"")`,
    );
  });

  test("renders a human-readable table by default", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 100 }, deps);

    const output = stdout.join("");
    expect(output).toContain("Found 2 ingest token(s) (12 total)");
    expect(output).toContain("Token A");
    expect(output).toContain("STATUS");
  });

  test("--json emits the raw token array without status chatter", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 100, json: true }, deps);

    expect(JSON.parse(stdout.join(""))).toEqual(tokens);
    expect(stdout.join("")).not.toContain("Fetching ingest tokens");
  });

  test("--format csv emits the raw token fields", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 100, format: "csv" }, deps);

    const output = stdout.join("");
    expect(output).toContain("id,name,description,disabled");
    expect(output).toContain("ds1token1,Token A");
    expect(output).not.toContain("Fetching ingest tokens");
  });

  test("--fields can show expanded usage statistics", async () => {
    const { context, stdout } = createMockContext();
    await list.call(
      context,
      { limit: 100, expand: true, fields: ["name", "lastUsed"] },
      deps,
    );

    const output = stdout.join("");
    expect(output).toContain("LAST USED");
    expect(output).toContain("Token B");
    expect(output).toContain("2026");
  });

  test("uses the returned page length in the next offset hint", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 10, offset: 4 }, deps);

    expect(stdout.join("")).toContain("--offset 6");
  });

  test("does not show a next-page hint on an exact fit", async () => {
    listIngestTokensFn.mockImplementationOnce(() =>
      Promise.resolve({ tokens, meta: { totalCount: 6 } }),
    );
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 10, offset: 4 }, deps);

    expect(stdout.join("")).not.toContain("More results may be available");
  });

  test("shows a next-page hint for a full page with an unknown total", async () => {
    listIngestTokensFn.mockImplementationOnce(() =>
      Promise.resolve({ tokens, meta: { totalCount: -1 } }),
    );
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 2, offset: 4 }, deps);

    expect(stdout.join("")).toContain("--offset 6");
  });

  test("does not show a next-page hint for a short page with an unknown total", async () => {
    listIngestTokensFn.mockImplementationOnce(() =>
      Promise.resolve({ tokens, meta: { totalCount: -1 } }),
    );
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 10, offset: 4 }, deps);

    expect(stdout.join("")).not.toContain("More results may be available");
  });

  test("warns when no tokens are found", async () => {
    listIngestTokensFn.mockImplementationOnce(() =>
      Promise.resolve({ tokens: [], meta: { totalCount: 0 } }),
    );
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 100 }, deps);

    expect(stdout.join("")).toContain("No ingest tokens found");
  });

  test("exits with code 1 on API error", async () => {
    listIngestTokensFn.mockImplementationOnce(() =>
      Promise.reject(new Error("Server error")),
    );
    const { context, stderr, getExitCode } = createMockContext();
    await list.call(context, { limit: 100 }, deps);

    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Server error");
  });
});
