import { describe, expect, test } from "bun:test";
import { Configuration, SourceDatasetApi } from "../generated";

describe("SourceDatasetApi", () => {
  test("update keeps nulls in the merge-patch body", async () => {
    const bodies: unknown[] = [];
    const api = new SourceDatasetApi(
      new Configuration({
        basePath: "https://123.observeinc.com",
        accessToken: () => Promise.resolve("123 tok"),
        fetchApi: (_url, init) => {
          bodies.push(JSON.parse(init?.body as string));
          return Promise.resolve(
            new Response(JSON.stringify({ id: "41" }), {
              headers: { "content-type": "application/json" },
            }),
          );
        },
      }),
    );
    await api.updateSourceDataset({
      id: "41",
      sourceDatasetUpdateRequest: {
        description: null,
        dataRetentionDays: null,
      },
    });
    expect(bodies[0]).toEqual({ description: null, dataRetentionDays: null });
  });
});
