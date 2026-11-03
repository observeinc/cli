import { describe, expect, test } from "bun:test";
import { defaultSpanName } from "./traced-fetch";

describe("defaultSpanName", () => {
  test("normalizes opaque ingest-token IDs", () => {
    expect(
      defaultSpanName(
        "GET",
        "https://example.observeinc.com/v1/ingest/tokens/ds1Op8G9WnYlHr5pYaiK",
      ),
    ).toBe("GET /v1/ingest/tokens/:id");
  });

  test("preserves ordinary path segments", () => {
    expect(
      defaultSpanName("GET", "https://example.com/v1/datasets/search"),
    ).toBe("GET /v1/datasets/search");
  });
});
