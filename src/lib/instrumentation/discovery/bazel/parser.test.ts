import { describe, expect, test } from "bun:test";
import { parseBazelDefs, parseBazelLoads, parseBazelRuleCalls } from "./parser";

describe("parseBazelLoads", () => {
  test("parses the label and positional and keyword symbols", () => {
    const loads = parseBazelLoads(
      'load("//build:defs.bzl", "cc_binary", alias = "hardened_cc_binary")',
    );
    expect(loads).toHaveLength(1);
    expect(loads[0]?.label).toBe("//build:defs.bzl");
    expect(loads[0]?.symbols).toEqual([
      { local: "cc_binary", exported: "cc_binary" },
      { local: "alias", exported: "hardened_cc_binary" },
    ]);
  });

  test("ignores load-like text inside strings and comments", () => {
    const loads = parseBazelLoads(
      [
        '# load("//x:y.bzl", "z")',
        'cc_binary(name = "load(nope)")',
        'load("@repo//pkg:file.bzl", "sym")',
      ].join("\n"),
    );
    expect(loads.map((load) => load.label)).toEqual(["@repo//pkg:file.bzl"]);
  });
});

describe("parseBazelDefs", () => {
  test("captures def bodies by indentation and masks literals", () => {
    const defs = parseBazelDefs(
      [
        "def wrapper(name, **kwargs):",
        '    """cc_binary lookalike in a docstring"""',
        "    native.cc_binary(name = name, **kwargs)",
        "",
        'top_level = "cc_binary"',
      ].join("\n"),
    );
    expect(defs).toHaveLength(1);
    expect(defs[0]?.name).toBe("wrapper");
    // The real call survives; the docstring mention is masked away.
    expect(defs[0]?.body).toContain("native.cc_binary");
    expect(defs[0]?.body).not.toContain("lookalike");
  });
});

describe("parseBazelRuleCalls", () => {
  test("does not mistake concatenation for a literal", () => {
    expect(
      parseBazelRuleCalls('cc_binary(name = "a" + "b")')[0]?.attributes.get(
        "name",
      )?.kind,
    ).toBe("dynamic");
  });

  test("preserves offsets after non-BMP characters", () => {
    const calls = parseBazelRuleCalls(
      'cc_binary(name = "\u{1f600}")\ncc_binary(name = "later")',
    );
    expect(calls[1]?.attributes.get("name")).toEqual({
      kind: "string",
      value: "later",
    });
  });

  test("recovers after an unclosed call", () => {
    expect(
      parseBazelRuleCalls('broken(\ncc_binary(name = "later")').map(
        (call) => call.rule,
      ),
    ).toEqual(["cc_binary"]);
  });

  test("ignores calls nested in top-level collections", () => {
    expect(parseBazelRuleCalls('[cc_binary(name = "not-top-level")]')).toEqual(
      [],
    );
    expect(
      parseBazelRuleCalls(
        'cc_binary(name = "test", testonly = 1)',
      )[0]?.attributes.get("testonly"),
    ).toEqual({ kind: "boolean", value: true });
  });

  test("parses top-level calls and literal attributes", () => {
    const calls = parseBazelRuleCalls(`
load("//tools:defs.bzl", "hardened_cc_binary")
# cc_binary(name = "fake")
hardened_cc_binary(
  name = "collector",
  srcs = ["main.cpp", "flags.cpp"],
  testonly = False,
  deps = select({"//conditions:default": []}),
)
`);
    expect(calls.map((call) => call.rule)).toEqual([
      "load",
      "hardened_cc_binary",
    ]);
    const binary = calls[1]!;
    expect(binary.attributes.get("name")).toEqual({
      kind: "string",
      value: "collector",
    });
    expect(binary.attributes.get("srcs")).toEqual({
      kind: "strings",
      value: ["main.cpp", "flags.cpp"],
    });
    expect(binary.attributes.get("testonly")).toEqual({
      kind: "boolean",
      value: false,
    });
    expect(binary.attributes.get("deps")?.kind).toBe("dynamic");
  });

  test("preserves computed attributes as dynamic", () => {
    const call = parseBazelRuleCalls(
      `py_binary(name = PREFIX + "tool", srcs = SRCS)`,
    )[0]!;
    expect(call.attributes.get("name")?.kind).toBe("dynamic");
    expect(call.attributes.get("srcs")?.kind).toBe("dynamic");
  });
});
