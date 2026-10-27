import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { Config } from "../../lib/config";
import { updateMonitor, type UpdateMonitorSdk } from "./update-monitor";
import { MonitorV2RuleKind } from "./types";

const CONFIG: Config = {
  customerId: "test-customer",
  domain: "observeinc.com",
  token: "test-token",
};

/** Request params recorded by the stubbed generated client, in call order. */
let calls: Record<string, unknown>[] = [];

const updateMonitorFn = mock((params: Record<string, unknown>) => {
  calls.push(params);
  return Promise.resolve();
});

const stubSdk: UpdateMonitorSdk = {
  monitorApi: {
    updateMonitor:
      updateMonitorFn as unknown as UpdateMonitorSdk["monitorApi"]["updateMonitor"],
  },
};

describe("updateMonitor", () => {
  beforeEach(() => {
    calls = [];
    updateMonitorFn.mockClear();
  });

  test("sends the id as a string", async () => {
    await updateMonitor({ config: CONFIG, id: 42, sdk: stubSdk, name: "n" });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.id).toBe("42");
  });

  test("sends the patch under both generated body keys", async () => {
    await updateMonitor({
      config: CONFIG,
      id: 42,
      sdk: stubSdk,
      name: "n",
      ruleKind: MonitorV2RuleKind.Count,
    });
    const expected = { name: "n", ruleKind: "Count" };
    expect(calls[0]!.monitorUpdateRequest).toEqual(expected);
    expect(calls[0]!.monitorV2PatchRequest).toEqual(expected);
  });

  test("does not leak config or sdk into the patch", async () => {
    await updateMonitor({ config: CONFIG, id: 42, sdk: stubSdk, name: "n" });
    for (const key of ["monitorUpdateRequest", "monitorV2PatchRequest"]) {
      const body = calls[0]![key] as Record<string, unknown>;
      expect(body).not.toHaveProperty("config");
      expect(body).not.toHaveProperty("sdk");
      expect(body).not.toHaveProperty("id");
    }
  });

  test("sends no version header", async () => {
    await updateMonitor({ config: CONFIG, id: 42, sdk: stubSdk, name: "n" });
    expect(Object.keys(calls[0]!).sort()).toEqual([
      "id",
      "monitorUpdateRequest",
      "monitorV2PatchRequest",
    ]);
  });
});
