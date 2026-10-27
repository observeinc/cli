import { afterEach, beforeAll, describe, expect, mock, test } from "bun:test";
import type { Config } from "../../lib/config";
import { createApiConfiguration } from "../api-config";
import { ExternalSharesApi, ExternalSharesDatasetKind } from "../generated";

const config = {
  customerId: "123",
  token: "tok",
  domain: "observeinc.com",
} as Config;

const realFetch = globalThis.fetch;

function respondWith(status: number, body: unknown): void {
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    )) as unknown as typeof fetch;
}

let registerShare: (typeof import("./register-share"))["registerShare"];
let trackShareTable: (typeof import("./track-share-table"))["trackShareTable"];

beforeAll(async () => {
  // Other test files replace ../client with mock.module, which leaks across
  // files, so pin it to a real ExternalSharesApi here.
  void mock.module(new URL("../client.ts", import.meta.url).pathname, () => ({
    ObserveRestSDK: class {
      externalSharesApi = new ExternalSharesApi(createApiConfiguration(config));
    },
  }));
  registerShare = (await import("./register-share.ts")).registerShare;
  trackShareTable = (await import("./track-share-table.ts")).trackShareTable;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("created", () => {
  test("register reports 201 as created and 200 as a replay", async () => {
    const body = { shareName: "S", providerAccount: "ACME.PROD" };
    respondWith(201, { id: "1" });
    const first = await registerShare({ config, body });
    respondWith(200, { id: "1" });
    const replay = await registerShare({ config, body });
    expect(first.created).toBe(true);
    expect(first.share.id).toBe("1");
    expect(replay.created).toBe(false);
  });

  test("track reports 201 as created and 200 as a replay", async () => {
    const body = {
      schemaName: "PUBLIC",
      tableName: "ORDERS",
      datasetLabel: "orders",
      datasetKind: ExternalSharesDatasetKind.Table,
    };
    respondWith(201, { id: "2" });
    const first = await trackShareTable({ config, shareId: "1", body });
    respondWith(200, { id: "2" });
    const replay = await trackShareTable({ config, shareId: "1", body });
    expect(first.created).toBe(true);
    expect(first.table.id).toBe("2");
    expect(replay.created).toBe(false);
  });
});
