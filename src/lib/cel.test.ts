import { describe, expect, test } from "bun:test";
import {
  celFuzzyContains,
  celHasCorrelationTag,
  escapeCelString,
  fuzzyContains,
} from "./cel";

describe("fuzzyContains", () => {
  test("single-word: plain case-insensitive substring", () => {
    expect(fuzzyContains("Tracing/Service Metrics", "service")).toBe(true);
    expect(fuzzyContains("Tracing/Service Metrics", "SERVICE")).toBe(true);
    expect(fuzzyContains("alpha-service", "beta")).toBe(false);
  });

  test("multi-word: full substring match takes precedence", () => {
    expect(fuzzyContains("Tracing/Service Metrics", "service metrics")).toBe(
      true,
    );
  });

  test("multi-word: token-independent match (order irrelevant)", () => {
    // "service" and "metrics" both present, but not as a contiguous phrase.
    expect(fuzzyContains("Metrics From Service X", "service metrics")).toBe(
      true,
    );
    expect(fuzzyContains("alpha-service", "service metrics")).toBe(false);
  });

  test("collapses extra whitespace in the needle", () => {
    expect(fuzzyContains("service metrics", "service   metrics")).toBe(true);
  });

  test("empty needle matches anything (parity with CEL)", () => {
    // `"".toLowerCase()` substring is always true.
    expect(fuzzyContains("anything", "")).toBe(true);
  });

  test("mirrors celFuzzyContains shape for single word", () => {
    // Sanity: single-token CEL has no `||` token branch.
    expect(celFuzzyContains("label", "foo")).toBe(
      'label.lowerAscii().contains("foo".lowerAscii())',
    );
  });

  test("mirrors celFuzzyContains shape for multi-word", () => {
    expect(celFuzzyContains("label", "service metrics")).toContain("||");
    expect(celFuzzyContains("label", "service metrics")).toContain("&&");
  });
});

describe("escapeCelString", () => {
  test("escapes quotes, backslashes, newlines, carriage returns, and tabs", () => {
    expect(escapeCelString('a"b\\c\nd\re\tf')).toBe('a\\"b\\\\c\\nd\\re\\tf');
  });

  test("leaves ordinary strings untouched", () => {
    expect(escapeCelString("service metrics")).toBe("service metrics");
  });

  test("neutralizes CEL injection payloads in celFuzzyContains", () => {
    // A bare quote would otherwise break out of the literal and inject
    // `||true||` into the filter expression.
    expect(celFuzzyContains("label", 'x")||true||("')).toBe(
      'label.lowerAscii().contains("x\\")||true||(\\"".lowerAscii())',
    );
    // Quotes stay escaped in the per-token branches too.
    const tokens = celFuzzyContains("label", 'a" b"');
    expect(tokens).toContain('"a\\"');
    expect(tokens).toContain('"b\\"');
    expect(tokens).not.toContain('"a"');
  });
});

describe("celHasCorrelationTag", () => {
  test("emits the hasCorrelationTag macro with both string literals", () => {
    expect(celHasCorrelationTag("customer.name", "tekion")).toBe(
      'hasCorrelationTag("customer.name", "tekion")',
    );
  });

  test("escapes quotes/backslashes in both arguments", () => {
    expect(celHasCorrelationTag('a"b', "c\\d")).toBe(
      'hasCorrelationTag("a\\"b", "c\\\\d")',
    );
  });
});
