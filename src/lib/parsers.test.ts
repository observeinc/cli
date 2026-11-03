import { describe, expect, test } from "bun:test";
import {
  makeFieldListParser,
  makeSortFieldParser,
  parseNonNegativeInt,
  parseMonitorId,
} from "./parsers";

describe("makeSortFieldParser", () => {
  const parseSort = makeSortFieldParser(["label", "updatedAt"]);

  test("passes a known field through, with or without -", () => {
    expect(parseSort("label")).toBe("label");
    expect(parseSort("-updatedAt")).toBe("-updatedAt");
  });

  test("rejects an unknown field and lists the options", () => {
    expect(() => parseSort("lable")).toThrow(/label, updatedAt/);
    expect(() => parseSort("--label")).toThrow(/Invalid sort field/);
  });
});

describe("makeFieldListParser", () => {
  const parseFields = makeFieldListParser(["id", "name"] as const);

  test("splits on commas and trims", () => {
    expect(parseFields("id, name")).toEqual(["id", "name"]);
  });

  test("rejects an unknown field", () => {
    expect(() => parseFields("id,nmae")).toThrow(/Invalid field: "nmae"/);
  });
});

describe("parseNonNegativeInt", () => {
  test("parses zero and positive integers", () => {
    expect(parseNonNegativeInt("0")).toBe(0);
    expect(parseNonNegativeInt("42")).toBe(42);
  });

  test("rejects negatives, non-integers, and non-numbers", () => {
    expect(() => parseNonNegativeInt("-1")).toThrow();
    expect(() => parseNonNegativeInt("1.5")).toThrow();
    expect(() => parseNonNegativeInt("foo")).toThrow();
  });
});

describe("parseMonitorId", () => {
  test("parses valid positive integers", () => {
    expect(parseMonitorId("1")).toBe(1);
    expect(parseMonitorId("42")).toBe(42);
    expect(parseMonitorId("41076897")).toBe(41076897);
    expect(parseMonitorId(String(Number.MAX_SAFE_INTEGER))).toBe(
      Number.MAX_SAFE_INTEGER,
    );
  });

  test("rejects zero", () => {
    expect(() => parseMonitorId("0")).toThrow();
  });

  test("rejects negative integers", () => {
    expect(() => parseMonitorId("-1")).toThrow();
    expect(() => parseMonitorId("-100")).toThrow();
  });

  test("rejects non-integer floats", () => {
    expect(() => parseMonitorId("1.5")).toThrow();
    expect(() => parseMonitorId("3.14")).toThrow();
  });

  test("rejects non-numeric strings", () => {
    expect(() => parseMonitorId("abc")).toThrow();
    expect(() => parseMonitorId("")).toThrow();
  });

  test("rejects integers exceeding MAX_SAFE_INTEGER", () => {
    expect(() => parseMonitorId(String(Number.MAX_SAFE_INTEGER + 1))).toThrow();
  });

  test("rejects whitespace-padded values", () => {
    expect(() => parseMonitorId(" 42")).toThrow();
    expect(() => parseMonitorId("42 ")).toThrow();
    expect(() => parseMonitorId(" 42 ")).toThrow();
  });
});
