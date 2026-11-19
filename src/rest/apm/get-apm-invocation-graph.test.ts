import { afterEach, beforeAll, describe, expect, mock, test } from "bun:test";
import type { Config } from "../../lib/config";
import { createApiConfiguration } from "../api-config";
import { APMApi } from "../generated";

const config = {
  customerId: "123",
  token: "tok",
  domain: "observeinc.com",
} as Config;

const realFetch = globalThis.fetch;
let urls: string[] = [];

function stubFetch(): void {
  urls = [];
  globalThis.fetch = ((input: string | URL | Request) => {
    urls.push(input instanceof Request ? input.url : String(input));
    return Promise.resolve(
      new Response(JSON.stringify({ services: [], invocations: [] }), {
        headers: { "Content-Type": "application/json" },
      }),
    );
  }) as unknown as typeof fetch;
}

let getApmInvocationGraph: (typeof import("./get-apm-invocation-graph"))["getApmInvocationGraph"];

beforeAll(async () => {
  // Other test files replace ../client with mock.module, which leaks across
  // files, so pin it to a real APMApi here.
  void mock.module(new URL("../client.ts", import.meta.url).pathname, () => ({
    ObserveRestSDK: class {
      apmApi = new APMApi(createApiConfiguration(config));
    },
  }));
  getApmInvocationGraph = (await import("./get-apm-invocation-graph.ts"))
    .getApmInvocationGraph;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("getApmInvocationGraph", () => {
  test("sends serviceType on the query string exactly once", async () => {
    stubFetch();
    await getApmInvocationGraph({
      config,
      environment: "prod",
      serviceName: "kafka",
      serviceType: "Messaging",
    });
    const url = new URL(urls[0]!);
    expect(url.pathname).toBe("/v1/apm/invocation-graph");
    expect(url.searchParams.getAll("serviceType")).toEqual(["Messaging"]);
    expect(url.searchParams.get("serviceName")).toBe("kafka");
  });

  test("percent-encodes a value with a space", async () => {
    stubFetch();
    await getApmInvocationGraph({
      config,
      environment: "prod",
      serviceName: "kafka",
      serviceType: "Message Broker",
    });
    expect(urls[0]).toContain("serviceType=Message%20Broker");
  });

  test("omits serviceType when not provided", async () => {
    stubFetch();
    await getApmInvocationGraph({
      config,
      environment: "prod",
      serviceName: "kafka",
    });
    expect(new URL(urls[0]!).searchParams.has("serviceType")).toBe(false);
  });
});
