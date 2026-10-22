import { describe, expect, test } from "bun:test";
import { discoverBazelApplications } from "./provider";
import type { BzlLoader } from "./labels";
import type { ProjectSnapshot } from "../../snapshot";

function snapshot(files: Record<string, string>): ProjectSnapshot {
  return {
    root: "/repo",
    files: Object.entries(files).map(([path, content]) => ({
      path,
      content,
      size: content.length,
    })),
    diagnostics: [],
    completeness: {
      filesSeen: 0,
      directoriesSeen: 0,
      manifestsSeen: 0,
      manifestsParsed: 0,
      manifestsFailed: 0,
      lockfilesSeen: 0,
      filesSkippedBySize: 0,
      unreadableFiles: 0,
      permissionErrors: 0,
      limitReached: false,
    },
  };
}

/** In-memory `.bzl` loader keyed by load label — no disk access. */
function loader(modules: Record<string, string>): BzlLoader {
  return (label) => {
    const content = modules[label];
    return content == null ? null : { absPath: label, content };
  };
}

describe("bazelApplicationProvider", () => {
  test("assigns BUILD files to the nearest Bazel workspace", () => {
    const result = discoverBazelApplications(
      snapshot({
        "MODULE.bazel": 'module(name = "root")',
        "apps/BUILD.bazel": 'cc_binary(name = "root_tool", srcs = ["main.cc"])',
        "vendor/MODULE.bazel": 'module(name = "vendor")',
        "vendor/tools/BUILD.bazel":
          'cc_binary(name = "vendor_tool", srcs = ["main.cc"])',
      }),
    );
    expect(
      result.candidates.map(
        (candidate) => candidate.discovery?.provenance.target,
      ),
    ).toEqual(["//apps:root_tool", "//tools:vendor_tool"]);
    expect(result.candidates[1]?.discovery?.provenance.workspaceRoot).toBe(
      "vendor",
    );
  });

  test("reports ambiguous BUILD package definitions", () => {
    const result = discoverBazelApplications(
      snapshot({
        "app/BUILD": 'cc_binary(name = "one")',
        "app/BUILD.bazel": 'cc_binary(name = "two")',
      }),
    );
    expect(result.candidates).toHaveLength(0);
    expect(result.diagnostics[0]?.code).toBe("AMBIGUOUS_BUILD_PACKAGE");
  });

  test("resolves native rules and an in-repo wrapper cleanly", () => {
    const result = discoverBazelApplications(
      snapshot({
        "BUILD.bazel": [
          'load("//build:go.bzl", "wrapped_go_binary")',
          'cc_binary(name = "cpp", srcs = ["main.cc"])',
          'wrapped_go_binary(name = "go", srcs = ["main.go"])',
          'py_binary(name = "python", srcs = ["main.py"])',
          'java_binary(name = "java", main_class = "com.acme.Main")',
          'rust_binary(name = "rust", srcs = ["main.rs"])',
        ].join("\n"),
      }),
      {
        loadBzl: loader({
          "//build:go.bzl": [
            'load("@rules_go//go:def.bzl", "go_binary")',
            "def wrapped_go_binary(**kwargs):",
            "    go_binary(**kwargs)",
          ].join("\n"),
        }),
      },
    );
    expect(result.candidates.map((candidate) => candidate.language.id)).toEqual(
      ["cpp", "go", "python", "java", "rust"],
    );
    // A resolved wrapper is now clean, not a partial with a diagnostic.
    expect(result.candidates[1]?.discovery?.completeness).toBe("resolved");
    expect(
      result.candidates.every(
        (candidate) => candidate.diagnostics.length === 0,
      ),
    ).toBe(true);
    expect(result.candidates[3]?.entrypoints[0]?.command).toBe("com.acme.Main");
    expect(result.candidates[0]?.id).toBe("cpp:.:cpp");
    expect(result.candidates[0]?.discovery?.provenance.target).toBe("//:cpp");
  });

  test("resolves a higher-order wrapper that delegates to a native rule", () => {
    const result = discoverBazelApplications(
      snapshot({
        "cpp/BUILD.bazel": [
          'load("//toolchain:cc.bzl", "hardened_cc_binary")',
          'hardened_cc_binary(name = "server", srcs = ["main.cc"])',
        ].join("\n"),
      }),
      {
        loadBzl: loader({
          "//toolchain:cc.bzl": [
            "def with_sanitizers(builder, **kwargs):",
            "    builder(**kwargs)",
            "def hardened_cc_binary(**kwargs):",
            "    with_sanitizers(native.cc_binary, **kwargs)",
          ].join("\n"),
        }),
      },
    );
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.language.id).toBe("cpp");
    expect(result.candidates[0]?.discovery?.completeness).toBe("resolved");
    expect(result.candidates[0]?.diagnostics).toHaveLength(0);
  });

  test("resolves a wrapper of a wrapper across load edges", () => {
    const result = discoverBazelApplications(
      snapshot({
        "svc/BUILD.bazel": [
          'load("//build:defs.bzl", "team_service")',
          'team_service(name = "svc", srcs = ["main.py"])',
        ].join("\n"),
      }),
      {
        loadBzl: loader({
          "//build:defs.bzl": [
            'load("@rules_python//python:defs.bzl", "py_binary")',
            "def base_binary(**kwargs):",
            "    py_binary(**kwargs)",
            "def team_service(**kwargs):",
            "    base_binary(**kwargs)",
          ].join("\n"),
        }),
      },
    );
    expect(result.candidates[0]?.language.id).toBe("python");
    expect(result.candidates[0]?.discovery?.completeness).toBe("resolved");
  });

  test("resolves a wrapper whose name carries no language token", () => {
    const result = discoverBazelApplications(
      snapshot({
        "exec/BUILD.bazel": [
          'load("//exec:rules.bzl", "svc_binary")',
          'svc_binary(name = "engine", srcs = ["engine.cc"])',
        ].join("\n"),
      }),
      {
        loadBzl: loader({
          "//exec:rules.bzl": [
            'load("@rules_cc//cc:cc_binary.bzl", "cc_binary")',
            "def svc_binary(name, **kwargs):",
            "    cc_binary(name = name, **kwargs)",
          ].join("\n"),
        }),
      },
    );
    expect(result.candidates[0]?.language.id).toBe("cpp");
    expect(result.candidates[0]?.discovery?.completeness).toBe("resolved");
  });

  test("resolves a wrapper bound under a local alias in the BUILD file", () => {
    const result = discoverBazelApplications(
      snapshot({
        "a/BUILD.bazel": [
          'load("//build:defs.bzl", myb = "hardened_cc_binary")',
          'myb(name = "aliased", srcs = ["main.cc"])',
        ].join("\n"),
      }),
      {
        loadBzl: loader({
          "//build:defs.bzl": [
            "def hardened_cc_binary(**kwargs):",
            "    native.cc_binary(**kwargs)",
          ].join("\n"),
        }),
      },
    );
    expect(result.candidates[0]?.language.id).toBe("cpp");
  });

  test("does not detect a macro loaded from an unreadable external repo", () => {
    const result = discoverBazelApplications(
      snapshot({
        "py/BUILD.bazel": [
          'load("@vendored_rules_python//python:defs.bzl", "vendored_py_binary")',
          'vendored_py_binary(name = "job", srcs = ["job.py"])',
        ].join("\n"),
      }),
      { loadBzl: loader({}) },
    );
    expect(result.candidates).toHaveLength(0);
    expect(result.diagnostics).toHaveLength(0);
  });

  test("does not invent a candidate for a macro that builds no binary", () => {
    const result = discoverBazelApplications(
      snapshot({
        "pp/BUILD.bazel": [
          'load("//pp:defs.bzl", "postprocess_binary")',
          'postprocess_binary(name = "pp", srcs = ["in.txt"])',
        ].join("\n"),
      }),
      {
        loadBzl: loader({
          "//pp:defs.bzl": [
            "def postprocess_binary(name, **kwargs):",
            "    native.genrule(name = name, **kwargs)",
          ].join("\n"),
        }),
      },
    );
    expect(result.candidates).toHaveLength(0);
    expect(result.diagnostics).toHaveLength(0);
  });

  test("excludes proven tests but retains production names containing test or bench", () => {
    const result = discoverBazelApplications(
      snapshot({
        "BUILD.bazel": [
          'cc_binary(name = "load_test_service", srcs = ["main.cc"])',
          'cc_binary(name = "benchmark_api", srcs = ["bench.cc"])',
          'cc_binary(name = "debug", testonly = True, srcs = ["debug.cc"])',
        ].join("\n"),
      }),
    );
    expect(result.candidates.map((candidate) => candidate.name)).toEqual([
      "load_test_service",
      "benchmark_api",
    ]);
  });

  test("reports dynamic identity and conditional test status", () => {
    const result = discoverBazelApplications(
      snapshot({
        "BUILD.bazel": [
          'cc_binary(name = PREFIX + "tool")',
          'py_binary(name = "conditional", testonly = IS_TEST, srcs = SRCS)',
        ].join("\n"),
      }),
    );
    expect(result.diagnostics[0]?.code).toBe("DYNAMIC_TARGET_NAME");
    expect(result.candidates[0]?.discovery?.completeness).toBe("partial");
    expect(result.candidates[0]?.diagnostics[0]?.code).toBe(
      "COMPUTED_TESTONLY",
    );
    expect(result.candidates[0]?.entrypoints).toHaveLength(0);
  });

  test("inherits runtime versions from nearest language manifests", () => {
    const result = discoverBazelApplications(
      snapshot({
        "go.mod": "module example.com/repo\n\ngo 1.24\n",
        "cmd/api/BUILD.bazel": 'go_binary(name = "api", srcs = ["main.go"])',
        "python/pyproject.toml":
          '[project]\nname = "tools"\nrequires-python = ">=3.12"',
        "python/tool/BUILD.bazel":
          'py_binary(name = "tool", srcs = ["main.py"])',
        "rust/Cargo.toml": '[package]\nname = "worker"\nrust-version = "1.85"',
        "rust/BUILD.bazel": 'rust_binary(name = "worker", srcs = ["main.rs"])',
      }),
    );
    expect(
      result.candidates.map((candidate) => candidate.language.version),
    ).toEqual(["1.24", ">=3.12", "1.85"]);
  });
});
