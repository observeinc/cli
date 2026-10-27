import { describe, expect, test } from "bun:test";
import {
  Configuration,
  ResponseError,
  StorageIntegrationsApi,
} from "../generated";

interface Call {
  url: string;
  init: RequestInit;
}

function apiWith(response: () => Response) {
  const calls: Call[] = [];
  const api = new StorageIntegrationsApi(
    new Configuration({
      basePath: "https://123.observeinc.com",
      accessToken: () => Promise.resolve("123 tok"),
      fetchApi: (url, init) => {
        calls.push({ url: url as string, init: init ?? {} });
        return Promise.resolve(response());
      },
    }),
  );
  return { api, calls };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

function headersOf(call: Call): Record<string, string> {
  return call.init.headers as Record<string, string>;
}

describe("StorageIntegrationsApi", () => {
  test("list sends only the set query params and the bearer token", async () => {
    const { api, calls } = apiWith(() =>
      json({ storageIntegrations: [], meta: { totalCount: 0 } }),
    );
    await api.listStorageIntegrations({
      filter: 'type == "Iceberg"',
      limit: 10,
    });

    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe("/v1/storage-integrations");
    expect(url.searchParams.get("filter")).toBe('type == "Iceberg"');
    expect(url.searchParams.get("limit")).toBe("10");
    expect(url.searchParams.has("offset")).toBe(false);
    expect(url.searchParams.has("expand")).toBe(false);
    expect(headersOf(calls[0]!).Authorization).toBe("Bearer 123 tok");
  });

  test("get encodes the id and passes expand", async () => {
    const { api, calls } = apiWith(() => json({ id: "77" }));
    await api.getStorageIntegration({ id: "77", expand: true });
    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe("/v1/storage-integrations/77");
    expect(url.searchParams.get("expand")).toBe("true");
  });

  test("a non-2xx response throws ResponseError", async () => {
    const { api } = apiWith(() =>
      json({ type: "feature_not_enabled", message: "not enabled" }, 403),
    );
    const err: unknown = await api
      .listStorageIntegrations({})
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ResponseError);
    expect((err as ResponseError).response.status).toBe(403);
  });
});
