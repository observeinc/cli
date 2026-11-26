import { describe, expect, test } from "bun:test";
import { addQueryParamsIfMissing } from "./add-query-params-if-missing";

const init = {} as RequestInit;
const fetch = globalThis.fetch;

describe("addQueryParamsIfMissing", () => {
  test("appends a missing param", async () => {
    const out = await addQueryParamsIfMissing({ serviceType: "Messaging" })({
      fetch,
      url: "https://x/v1/a?environment=prod",
      init,
    });
    expect(out?.url).toBe(
      "https://x/v1/a?environment=prod&serviceType=Messaging",
    );
  });

  test("leaves a param already on the URL alone", async () => {
    const url = "https://x/v1/a?serviceType=Messaging";
    const out = await addQueryParamsIfMissing({ serviceType: "Service" })({
      fetch,
      url,
      init,
    });
    expect(out?.url).toBe(url);
  });

  test("skips undefined values", async () => {
    const url = "https://x/v1/a";
    const out = await addQueryParamsIfMissing({ serviceType: undefined })({
      fetch,
      url,
      init,
    });
    expect(out?.url).toBe(url);
  });
});
