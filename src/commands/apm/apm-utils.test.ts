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
} from "./apm-utils";

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
