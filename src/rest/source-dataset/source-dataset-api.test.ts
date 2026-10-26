import { describe, expect, test } from "bun:test";
import { Configuration, ResponseError, SourceDatasetApi } from "../generated";

interface Call {
  url: string;
  init: RequestInit;
}

function apiWith(response: () => Response) {
  const calls: Call[] = [];
  const api = new SourceDatasetApi(
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

describe("SourceDatasetApi", () => {
  test("list sends only the set query params and the bearer token", async () => {
    const { api, calls } = apiWith(() =>
      json({ sourceDatasets: [], meta: { totalCount: 0 } }),
    );
    await api.listSourceDatasets({ filter: 'label == "a/b"', limit: 10 });

    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe("/v1/source-datasets");
    expect(url.searchParams.get("filter")).toBe('label == "a/b"');
    expect(url.searchParams.get("limit")).toBe("10");
    expect(url.searchParams.has("offset")).toBe(false);
    expect(url.searchParams.has("expand")).toBe(false);
    expect(headersOf(calls[0]!).Authorization).toBe("Bearer 123 tok");
  });

  test("get encodes the id and passes expand", async () => {
    const { api, calls } = apiWith(() => json({ id: "41" }));
    await api.getSourceDataset({ id: "41", expand: true });
    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe("/v1/source-datasets/41");
    expect(url.searchParams.get("expand")).toBe("true");
  });

  test("create posts a JSON body", async () => {
    const { api, calls } = apiWith(() => json({ id: "41" }));
    await api.createSourceDataset({
      sourceDatasetCreateRequest: { label: "Logs/app" },
    });
    expect(calls[0]!.init.method).toBe("POST");
    expect(headersOf(calls[0]!)["Content-Type"]).toBe("application/json");
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
      label: "Logs/app",
    });
  });

  test("update keeps nulls in the merge-patch body", async () => {
    const { api, calls } = apiWith(() => json({ id: "41" }));
    await api.updateSourceDataset({
      id: "41",
      sourceDatasetUpdateRequest: {
        description: null,
        dataRetentionDays: null,
      },
    });
    expect(calls[0]!.init.method).toBe("PATCH");
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
      description: null,
      dataRetentionDays: null,
    });
  });

  test("delete sends force only when set", async () => {
    const { api, calls } = apiWith(() => new Response(null, { status: 204 }));
    await api.deleteSourceDataset({ id: "41" });
    await api.deleteSourceDataset({ id: "41", force: true });
    expect(calls[0]!.init.method).toBe("DELETE");
    expect(new URL(calls[0]!.url).searchParams.has("force")).toBe(false);
    expect(new URL(calls[1]!.url).searchParams.get("force")).toBe("true");
  });

  test("a non-2xx response throws ResponseError", async () => {
    const { api } = apiWith(() =>
      json({ type: "dependents_exist", message: "in use" }, 409),
    );
    const err: unknown = await api
      .deleteSourceDataset({ id: "41" })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ResponseError);
    expect((err as ResponseError).response.status).toBe(409);
  });
});
