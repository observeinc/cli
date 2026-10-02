import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { Config } from "../../lib/config";
import {
  MonitorV2Health,
  MonitorV2RuleKind,
  type MonitorV2,
} from "../generated";
import { ResponseError } from "../generated/runtime";
import {
  getMonitor,
  preserveMonitorGetFields,
  type GetMonitorSdk,
} from "./get-monitor";

const CONFIG: Config = {
  customerId: "test-customer",
  domain: "observeinc.com",
  token: "test-token",
};

function parsedMonitor(overrides: Partial<MonitorV2> = {}): MonitorV2 {
  return {
    id: "41072994",
    name: "clone-config-parity",
    ruleKind: MonitorV2RuleKind.Threshold,
    definition: {} as MonitorV2["definition"],
    ...overrides,
  };
}

describe("preserveMonitorGetFields", () => {
  test("copies actionRules, health, and effectiveScheduling from the raw GET body", () => {
    const actionRules = [{ actionId: "41075519" }];
    const effectiveScheduling = {
      transform: { freshnessGoal: "60000000000" },
    };
    const parsed = parsedMonitor({ disabled: false });

    const result = preserveMonitorGetFields(parsed, {
      id: "41072994",
      name: "clone-config-parity",
      disabled: false,
      ruleKind: "Threshold",
      definition: {},
      actionRules,
      health: MonitorV2Health.Running,
      effectiveScheduling,
    });

    expect(result.actionRules).toEqual(actionRules);
    expect(result.health).toBe(MonitorV2Health.Running);
    expect(result.effectiveScheduling).toEqual(effectiveScheduling);
  });

  test("does not invent keys the API omitted", () => {
    const result = preserveMonitorGetFields(parsedMonitor(), {
      id: "42",
      name: "Test Monitor",
      ruleKind: "Count",
      definition: {},
    });

    expect(result).not.toHaveProperty("actionRules");
    expect(result).not.toHaveProperty("health");
    expect(result).not.toHaveProperty("effectiveScheduling");
  });
});

/** Request params recorded by the stubbed generated client, in call order. */
let calls: Record<string, unknown>[] = [];

/** Set per-test to drive the stubbed generated client's response. */
let respond: (params: Record<string, unknown>) => Promise<{
  raw: Response;
  value: () => Promise<MonitorV2>;
}>;

const getMonitorRawFn = mock((params: Record<string, unknown>) => {
  calls.push(params);
  return respond(params);
});

const stubSdk: GetMonitorSdk = {
  monitorApi: { getMonitorRaw: getMonitorRawFn },
};

function jsonApiResponse(
  status: number,
  body: unknown,
): { raw: Response; value: () => Promise<MonitorV2> } {
  const raw = new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
  return {
    raw,
    value: async () => {
      const json = (await raw.json()) as Record<string, unknown>;
      // Mimic a stale generated FromJSON pick-list that keeps only id, name, disabled, ruleKind, and definition.
      const id = typeof json.id === "string" ? json.id : "";
      const name = typeof json.name === "string" ? json.name : "";
      return parsedMonitor({
        id,
        name,
        disabled: json.disabled as boolean | undefined,
        ruleKind: json.ruleKind as MonitorV2["ruleKind"],
        definition: json.definition as MonitorV2["definition"],
      });
    },
  };
}

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
  throw new Error("expected getMonitor to reject, but it resolved");
}

beforeEach(() => {
  calls = [];
  getMonitorRawFn.mockClear();
});

describe("getMonitor — field preservation", () => {
  test("restores actionRules, health, and effectiveScheduling dropped by FromJSON", async () => {
    const actionRules = [
      { actionId: "41075519", definition: { type: "Slack" } },
    ];
    const effectiveScheduling = { scheduled: { cronConfig: "0 * * * *" } };
    const payload = {
      id: "41072994",
      name: "clone-config-parity",
      disabled: false,
      monitorVersion: "1788321475483179000",
      ruleKind: "Threshold",
      definition: { rules: [] },
      actionRules,
      health: MonitorV2Health.Running,
      effectiveScheduling,
    };
    respond = () => Promise.resolve(jsonApiResponse(200, payload));

    const result = await getMonitor({
      config: CONFIG,
      id: 41072994,
      sdk: stubSdk,
    });

    expect(calls).toEqual([{ id: 41072994 }]);
    expect(result).not.toBeNull();
    expect(result!.actionRules).toEqual(actionRules);
    expect(result!.health).toBe(MonitorV2Health.Running);
    expect(result!.effectiveScheduling).toEqual(effectiveScheduling);
    expect(result!.id).toBe("41072994");
  });

  test("returns null on 404", async () => {
    respond = () => Promise.reject(responseError(404));

    expect(
      await getMonitor({ config: CONFIG, id: 99999, sdk: stubSdk }),
    ).toBeNull();
    expect(calls).toHaveLength(1);
  });

  test("rethrows a non-404 ResponseError", async () => {
    respond = () => Promise.reject(responseError(500));

    const err = await captureError(
      getMonitor({ config: CONFIG, id: 42, sdk: stubSdk }),
    );

    expect(err).toBeInstanceOf(ResponseError);
    expect((err as ResponseError).response.status).toBe(500);
    expect(calls).toHaveLength(1);
  });
});
