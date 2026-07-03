import { describe, expect, test } from "bun:test";
import type {
  ApmInterval,
  ApmInvocationParticipant,
  ApmMeta,
} from "../../rest/generated";
import {
  describeMode,
  describeNode,
  formatLatency,
  formatRate,
  formatWindow,
  paginationHint,
  parseApmLimit,
  parseLookbackHours,
  resolveTimeWindow,
} from "./apm-utils";

describe("parseLookbackHours", () => {
  test("accepts positive numbers", () => {
    expect(parseLookbackHours("4")).toBe(4);
    expect(parseLookbackHours("1.5")).toBe(1.5);
  });
  test("rejects zero, negative, and non-numeric", () => {
    expect(() => parseLookbackHours("0")).toThrow("positive");
    expect(() => parseLookbackHours("-1")).toThrow("positive");
    expect(() => parseLookbackHours("abc")).toThrow("positive");
  });
});

describe("parseApmLimit", () => {
  test("accepts integers in range", () => {
    expect(parseApmLimit("1")).toBe(1);
    expect(parseApmLimit("100000")).toBe(100000);
  });
  test("rejects out-of-range, non-integer, non-numeric", () => {
    expect(() => parseApmLimit("0")).toThrow("between");
    expect(() => parseApmLimit("100001")).toThrow("between");
    expect(() => parseApmLimit("1.5")).toThrow("between");
    expect(() => parseApmLimit("x")).toThrow("between");
  });
});

describe("resolveTimeWindow", () => {
  test("--lookback resolves to an ISO window of the right span", () => {
    const { startTime, endTime } = resolveTimeWindow({ lookback: 4 });
    expect(typeof startTime).toBe("string");
    expect(typeof endTime).toBe("string");
    const span = (Date.parse(endTime!) - Date.parse(startTime!)) / 3_600_000;
    expect(span).toBeCloseTo(4, 1);
  });

  test("absolute times are validated and normalized to ISO", () => {
    expect(
      resolveTimeWindow({
        startTime: "2026-07-01T00:00:00Z",
        endTime: "2026-07-01T06:00:00Z",
      }),
    ).toEqual({
      startTime: "2026-07-01T00:00:00.000Z",
      endTime: "2026-07-01T06:00:00.000Z",
    });
  });

  test("only one absolute bound is allowed (the other stays undefined)", () => {
    expect(resolveTimeWindow({ startTime: "2026-07-01T00:00:00Z" })).toEqual({
      startTime: "2026-07-01T00:00:00.000Z",
      endTime: undefined,
    });
  });

  test("none → both undefined (server applies its default)", () => {
    expect(resolveTimeWindow({})).toEqual({
      startTime: undefined,
      endTime: undefined,
    });
  });

  test("--lookback + absolute is a conflict", () => {
    expect(() =>
      resolveTimeWindow({ lookback: 4, startTime: "2026-07-01T00:00:00Z" }),
    ).toThrow("Use either --lookback");
  });

  test("an unparseable timestamp is rejected", () => {
    expect(() => resolveTimeWindow({ startTime: "garbage" })).toThrow(
      "--start-time",
    );
  });
});

describe("formatRate / formatLatency", () => {
  test("nullish renders as -", () => {
    expect(formatRate(null)).toBe("-");
    expect(formatRate(undefined)).toBe("-");
    expect(formatLatency(null)).toBe("-");
  });
  test("numbers render at fixed precision", () => {
    expect(formatRate(12.5)).toBe("12.50");
    expect(formatLatency(0.5)).toBe("0.500");
  });
});

describe("describeNode", () => {
  const base: ApmInvocationParticipant = {
    serviceName: "checkout",
    environment: "prod",
    serviceNamespace: null,
    type: null,
    language: null,
  };
  test("bare service@env", () => {
    expect(describeNode(base)).toBe("checkout@prod");
  });
  test("namespace prefix and endpoint suffix", () => {
    expect(
      describeNode({
        ...base,
        serviceNamespace: "shop",
        endpointName: "GET /cart",
      }),
    ).toBe("shop/checkout@prod (GET /cart)");
  });
});

describe("describeMode", () => {
  test("all four modes", () => {
    expect(describeMode({})).toBe("global");
    expect(describeMode({ serviceName: "s" })).toBe("focal-service");
    expect(describeMode({ serviceName: "s", directNeighborsOnly: true })).toBe(
      "focal-service (1-hop)",
    );
    expect(describeMode({ serviceName: "s", endpointName: "GET /x" })).toBe(
      "focal-endpoint",
    );
  });
});

describe("paginationHint", () => {
  const meta = (over: Partial<ApmMeta>): ApmMeta => ({
    totalCount: -1,
    limit: 2,
    offset: 0,
    ...over,
  });
  test("full page with unknown total → hint", () => {
    expect(paginationHint(meta({ totalCount: -1 }), 2)).toContain("--offset 2");
  });
  test("full page with a known remaining total → hint", () => {
    expect(paginationHint(meta({ totalCount: 10 }), 2)).toContain("--offset 2");
  });
  test("partial page → no hint", () => {
    expect(paginationHint(meta({}), 1)).toBeNull();
  });
  test("full page but total exhausted → no hint", () => {
    expect(paginationHint(meta({ totalCount: 2 }), 2)).toBeNull();
  });
});

describe("formatWindow", () => {
  test("renders the resolved interval", () => {
    const interval: ApmInterval = {
      startTime: "2026-07-03T00:00:00.000Z",
      endTime: "2026-07-03T01:00:00.000Z",
    };
    expect(formatWindow(interval)).toBe(
      "window 2026-07-03T00:00:00.000Z → 2026-07-03T01:00:00.000Z",
    );
  });
});
