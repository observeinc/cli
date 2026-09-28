import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import { resolve } from "node:path";
import type { Config } from "../../lib/config";
import { MonitorRuleKind, type MonitorResource } from "../generated";
import { ResponseError } from "../generated/runtime";

const repoRoot = resolve(import.meta.dir, "../../..");
const clientModulePath = resolve(repoRoot, "src/rest/client.ts");

const CONFIG: Config = {
  customerId: "test-customer",
  domain: "observeinc.com",
  token: "test-token",
};

/** Request params recorded by the stubbed generated client, in call order. */
let calls: Record<string, unknown>[] = [];

/** Set per-test to drive the stubbed generated client's response. */
let respond: (params: Record<string, unknown>) => Promise<unknown>;

const listMonitorsApiFn = mock((params: Record<string, unknown>) => {
  calls.push(params);
  return respond(params);
});

function responseError(status: number): ResponseError {
  return new ResponseError(new Response("", { status }));
}

/** Await an expected rejection and hand back the thrown value. */
async function captureError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (err) {
    return err;
  }
  throw new Error("expected listMonitors to reject, but it resolved");
}

let listMonitors: (typeof import("./list-monitors"))["listMonitors"];

beforeAll(async () => {
  void mock.module(clientModulePath, () => ({
    ObserveRestSDK: class {
      monitorApi = { listMonitors: listMonitorsApiFn };
    },
  }));

  const mod = await import("./list-monitors.ts");
  listMonitors = mod.listMonitors;
});

afterAll(() => {
  mock.restore();
});

beforeEach(() => {
  calls = [];
  listMonitorsApiFn.mockClear();
});

describe("listMonitors — versioned path", () => {
  test("unwraps `monitors` from the versioned envelope", async () => {
    const monitor = {
      id: "1",
      label: "Alpha Monitor",
    } as unknown as MonitorResource;
    respond = () =>
      Promise.resolve({ monitors: [monitor], meta: { total: 1 } });

    const result = await listMonitors({
      config: CONFIG,
      nameSubstring: "alpha",
    });

    expect(result).toEqual([monitor]);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      nameSubstring: "alpha",
      observeApiVersion: "2026-08-04",
    });
  });

  test("returns an empty array when the envelope holds no monitors", async () => {
    respond = () => Promise.resolve({ monitors: [], meta: { total: 0 } });

    expect(await listMonitors({ config: CONFIG })).toEqual([]);
    expect(calls).toHaveLength(1);
  });
});

describe("listMonitors — legacy fallback on 403", () => {
  /** Reject the versioned request with 403; serve a bare legacy array on retry. */
  function legacyOnRetry(legacy: unknown) {
    return (params: Record<string, unknown>) =>
      params.observeApiVersion == null
        ? Promise.resolve(legacy)
        : Promise.reject(responseError(403));
  }

  test("retries without the version header and maps `name` to `label`", async () => {
    respond = legacyOnRetry([
      {
        id: "1",
        name: "Legacy Monitor",
        description: null,
        disabled: false,
        ruleKind: "Count",
      },
    ]);

    const result = await listMonitors({ config: CONFIG, limit: 5 });

    expect(calls).toHaveLength(2);
    // The retry must drop observeApiVersion but keep the caller's params.
    expect(calls[0]).toHaveProperty("observeApiVersion", "2026-08-04");
    expect(calls[1]).not.toHaveProperty("observeApiVersion");
    expect(calls[1]).toMatchObject({ limit: 5 });

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("1");
    expect(result[0]!.label).toBe("Legacy Monitor");
    expect(result[0]!.ruleKind).toBe(MonitorRuleKind.Count);
  });

  test("maps a legacy monitor with no name to an empty label", async () => {
    respond = legacyOnRetry([{ id: "7" }]);

    const result = await listMonitors({ config: CONFIG });

    expect(result[0]!.label).toBe("");
  });

  test("returns an empty array when the legacy retry yields none", async () => {
    respond = legacyOnRetry([]);

    expect(await listMonitors({ config: CONFIG })).toEqual([]);
    expect(calls).toHaveLength(2);
  });
});

describe("listMonitors — error propagation", () => {
  test("rethrows a non-403 ResponseError without retrying", async () => {
    respond = () => Promise.reject(responseError(500));

    const err = await captureError(listMonitors({ config: CONFIG }));

    expect(err).toBeInstanceOf(ResponseError);
    expect((err as ResponseError).response.status).toBe(500);
    expect(calls).toHaveLength(1);
  });

  test("rethrows a 401 ResponseError without retrying", async () => {
    respond = () => Promise.reject(responseError(401));

    const err = await captureError(listMonitors({ config: CONFIG }));

    expect(err).toBeInstanceOf(ResponseError);
    expect((err as ResponseError).response.status).toBe(401);
    expect(calls).toHaveLength(1);
  });

  test("rethrows a non-API error without retrying", async () => {
    respond = () => Promise.reject(new TypeError("network down"));

    const err = await captureError(listMonitors({ config: CONFIG }));

    expect(err).toBeInstanceOf(TypeError);
    expect((err as TypeError).message).toBe("network down");
    expect(calls).toHaveLength(1);
  });
});
