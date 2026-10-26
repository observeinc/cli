import { describe, expect, test } from "bun:test";
import {
  celFuzzyContains,
  celHasCorrelationTag,
  celMatchesInsensitive,
  combineFilters,
  escapeCelString,
} from "./cel";

describe("celFuzzyContains", () => {
  test("single word has no `||` token branch", () => {
    expect(celFuzzyContains("label", "foo")).toBe(
      'label.lowerAscii().contains("foo".lowerAscii())',
    );
  });

  test("multi-word combines a full-phrase branch with a token branch", () => {
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

describe("celMatchesInsensitive", () => {
  test("escapes regex metacharacters so the term matches literally", () => {
    // `\\.` in the emitted source; CEL unescapes it to `\.` for the regex.
    expect(celMatchesInsensitive("name", "a.b*c")).toBe(
      'name.matches("(?i)a\\\\.b\\\\*c")',
    );
  });

  test("leaves ordinary strings untouched", () => {
    expect(celMatchesInsensitive("name", "prod")).toBe(
      'name.matches("(?i)prod")',
    );
  });

  test("escapes quotes so they cannot terminate the CEL literal", () => {
    // Regex-escaping alone leaves the `"` bare, which the API rejects with
    // `Syntax error: mismatched input`.
    expect(celMatchesInsensitive("name", 'a"b')).toBe(
      'name.matches("(?i)a\\"b")',
    );
  });

  test("neutralizes CEL injection payloads", () => {
    const filter = celMatchesInsensitive(
      "name",
      '" && createdBy.id == 1 && name.matches("',
    );
    // Every quote from the payload stays escaped, so the whole term remains
    // one string literal instead of closing it and appending clauses.
    expect(filter.match(/(?<!\\)"/g)).toHaveLength(2);
  });

  test("double-escapes a backslash so the regex sees one literal backslash", () => {
    // CEL unescapes `\\\\` to `\\`, which the regex engine reads as a literal
    // backslash. A single pass would leave a dangling escape.
    expect(celMatchesInsensitive("name", "a\\b")).toBe(
      'name.matches("(?i)a\\\\\\\\b")',
    );
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

describe("combineFilters", () => {
  test("returns undefined when no clauses are active", () => {
    expect(combineFilters([])).toBeUndefined();
    expect(combineFilters([undefined, false, null, ""])).toBeUndefined();
  });

  test("returns a lone clause verbatim (no wrapping parens)", () => {
    expect(combineFilters(['kind == "Correlation"'])).toBe(
      'kind == "Correlation"',
    );
    expect(combineFilters([undefined, "a == 1", false])).toBe("a == 1");
  });

  test("parenthesizes each clause when combining multiple", () => {
    expect(combineFilters(['kind == "Correlation"', "a == 1"])).toBe(
      '(kind == "Correlation") && (a == 1)',
    );
  });

  test("keeps a clause with a top-level || bound correctly under &&", () => {
    // Without the wrapping parens this would mis-parse as
    // `a && b || c` due to CEL's `&&`-over-`||` precedence.
    expect(combineFilters(["a", "b || c"])).toBe("(a) && (b || c)");
  });
});
