import { describe, expect, test } from "bun:test";
import { Configuration, ResponseError } from "../generated/runtime";
import { ShareInApi } from "./share-in-api";

interface Call {
  url: string;
  init: RequestInit;
}

function apiWith(response: () => Response) {
  const calls: Call[] = [];
  const api = new ShareInApi(
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

describe("ShareInApi", () => {
  test("setup is a GET with the bearer token", async () => {
    const { api, calls } = apiWith(() =>
      json({ consumerAccount: "OBS.C1", region: "AWS_US_WEST_2", cloud: null }),
    );
    const info = await api.getSetupInfo();
    expect(new URL(calls[0]!.url).pathname).toBe("/v1/shares/inbound/setup");
    expect(calls[0]!.init.method).toBe("GET");
    expect(headersOf(calls[0]!).Authorization).toBe("Bearer 123 tok");
    expect(info.consumerAccount).toBe("OBS.C1");
  });

  test("registration token posts only the provider account", async () => {
    const { api, calls } = apiWith(() =>
      json({ token: "secret", expiresAt: "2026-10-21T00:00:00Z" }, 201),
    );
    await api.createRegistrationToken({ providerAccount: "ACME.PROD" });
    expect(new URL(calls[0]!.url).pathname).toBe(
      "/v1/shares/inbound/registration-tokens",
    );
    expect(calls[0]!.init.method).toBe("POST");
    expect(headersOf(calls[0]!)["Content-Type"]).toBe("application/json");
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
      providerAccount: "ACME.PROD",
    });
  });

  test("register reports 201 as created and 200 as a replay", async () => {
    let status = 201;
    const { api, calls } = apiWith(() => json({ id: "7" }, status));
    const first = await api.registerShare({
      providerAccount: "ACME.PROD",
      shareName: "OBSERVE_SHARE",
    });
    status = 200;
    const replay = await api.registerShare({
      providerAccount: "ACME.PROD",
      shareName: "OBSERVE_SHARE",
    });
    expect(new URL(calls[0]!.url).pathname).toBe("/v1/shares/inbound");
    expect(first.created).toBe(true);
    expect(replay.created).toBe(false);
    expect(replay.share.id).toBe("7");
  });

  test("list sends only the set query params", async () => {
    const { api, calls } = apiWith(() =>
      json({ shares: [], meta: { totalCount: 0 } }),
    );
    await api.listShares({ status: "Active", limit: 10 });
    const url = new URL(calls[0]!.url);
    expect(url.searchParams.get("status")).toBe("Active");
    expect(url.searchParams.get("limit")).toBe("10");
    expect(url.searchParams.has("healthStatus")).toBe(false);
    expect(url.searchParams.has("offset")).toBe(false);
  });

  test("update patches the label", async () => {
    const { api, calls } = apiWith(() => json({ id: "7" }));
    await api.updateShare({ shareId: "7", body: { label: "Orders" } });
    expect(new URL(calls[0]!.url).pathname).toBe("/v1/shares/inbound/7");
    expect(calls[0]!.init.method).toBe("PATCH");
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
      label: "Orders",
    });
  });

  test("delete sends force only when set", async () => {
    const { api, calls } = apiWith(() => new Response(null, { status: 204 }));
    await api.deleteShare({ shareId: "7" });
    await api.deleteShare({ shareId: "7", force: true });
    expect(calls[0]!.init.method).toBe("DELETE");
    expect(new URL(calls[0]!.url).searchParams.has("force")).toBe(false);
    expect(new URL(calls[1]!.url).searchParams.get("force")).toBe("true");
  });

  test("table paths nest under the share and encode ids", async () => {
    const { api, calls } = apiWith(() =>
      json({ tables: [], meta: { totalCount: 0 } }),
    );
    await api.listShareTables({
      shareId: "7",
      filter: 'status == "Active"',
      expand: true,
    });
    await api.getShareTable({ shareId: "7", tableId: "a/b" });
    const listUrl = new URL(calls[0]!.url);
    expect(listUrl.pathname).toBe("/v1/shares/inbound/7/tables");
    expect(listUrl.searchParams.get("filter")).toBe('status == "Active"');
    expect(listUrl.searchParams.get("expand")).toBe("true");
    expect(calls[1]!.url).toContain("/v1/shares/inbound/7/tables/a%2Fb");
  });

  test("track posts the body and reports created", async () => {
    const { api, calls } = apiWith(() => json({ id: "9" }, 201));
    const { created } = await api.trackShareTable({
      shareId: "7",
      body: {
        tableName: "EVENTS",
        schemaName: "PUBLIC",
        datasetLabel: "Orders/events",
        datasetKind: "Event",
        validFromField: "TS",
      },
    });
    expect(calls[0]!.init.method).toBe("POST");
    expect(JSON.parse(calls[0]!.init.body as string)).toMatchObject({
      datasetKind: "Event",
      validFromField: "TS",
    });
    expect(created).toBe(true);
  });

  test("table update and untrack use PATCH and DELETE", async () => {
    const { api, calls } = apiWith(() => json({ id: "9" }));
    await api.updateShareTable({
      shareId: "7",
      tableId: "9",
      body: { datasetLabel: "Orders/v2" },
    });
    await api.untrackShareTable({ shareId: "7", tableId: "9" });
    expect(calls[0]!.init.method).toBe("PATCH");
    expect(calls[1]!.init.method).toBe("DELETE");
    expect(new URL(calls[1]!.url).pathname).toBe(
      "/v1/shares/inbound/7/tables/9",
    );
  });

  test("a non-2xx response throws ResponseError", async () => {
    const { api } = apiWith(() =>
      json({ type: "share_has_tracked_tables", message: "has tables" }, 409),
    );
    const err: unknown = await api
      .deleteShare({ shareId: "7" })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ResponseError);
    expect((err as ResponseError).response.status).toBe(409);
  });
});
