import { describe, expect, test } from "bun:test";
import { resolveNative } from "./native-providers";
import type { CandidateApplication } from "../types";
import type { ProjectSnapshot } from "../snapshot";

const candidate: CandidateApplication = {
  id: "go:.",
  path: ".",
  name: "app",
  language: { id: "go" },
  runtime: { id: "go" },
  dependencies: [],
  frameworks: [],
  lockfiles: [],
  entrypoints: [],
  testFrameworks: [],
  containerFiles: [],
  deploymentFiles: [],
  evidence: [{ kind: "manifest", path: "pom.xml" }],
  diagnostics: [],
};
const snapshot: ProjectSnapshot = {
  root: "/repo",
  files: [],
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

describe("native resolver parsing", () => {
  test.each(["rust", "go"] as const)(
    "%s reports malformed output instead of a graph",
    (language) => {
      const resolution = resolveNative({
        candidate: { ...candidate, language: { id: language } },
        snapshot,
        run: () => ({ stdout: "{invalid}", stderr: "", status: 0 }),
      });
      expect(resolution?.graph).toBeNull();
      expect(resolution?.diagnostic?.code).toBe("RESOLVE_FAILED");
    },
  );

  test("a resolver that cannot run explains why", () => {
    const resolution = resolveNative({
      candidate,
      snapshot,
      run: () => ({
        stdout: "",
        stderr: "",
        status: 1,
        error: "go is not installed or not on PATH",
      }),
    });
    expect(resolution?.graph).toBeNull();
    expect(resolution?.diagnostic?.message).toContain("go is not installed");
  });

  test("a failing resolver reports its first stderr line and a remedy", () => {
    const resolution = resolveNative({
      candidate,
      snapshot,
      run: () => ({
        stdout: "",
        stderr: "\ngo: module lookup disabled by GOPROXY=off\nmore\n",
        status: 1,
      }),
    });
    expect(resolution?.diagnostic?.message).toContain(
      "exited 1: go: module lookup disabled by GOPROXY=off",
    );
    expect(resolution?.diagnostic?.message).toContain("go mod download");
  });

  test.each(["pom.xml", "build.gradle"])(
    "Java (%s) runs no build tool and points to --sbom",
    (manifest) => {
      const resolution = resolveNative({
        candidate: {
          ...candidate,
          language: { id: "java" },
          evidence: [{ kind: "manifest", path: manifest }],
        },
        snapshot,
        run: () => {
          throw new Error("must not run");
        },
      });
      expect(resolution?.diagnostic).toMatchObject({
        code: "RESOLVE_UNSUPPORTED",
        severity: "info",
      });
      expect(resolution?.diagnostic?.message).toContain("--sbom");
    },
  );

  test("resolvers exist only for Rust and Go", () => {
    expect(
      resolveNative({
        candidate: { ...candidate, language: { id: "python" } },
        snapshot,
      }),
    ).toBeNull();
  });

  test("Go uses read-only module resolution and parses a JSON stream", () => {
    const result = resolveNative({
      candidate,
      snapshot,
      run: ({ args }) => {
        expect(args).toContain("-mod=readonly");
        return {
          stdout:
            JSON.stringify({
              ImportPath: "app",
              Name: "main",
              Imports: ["dependency"],
            }) +
            "\n" +
            JSON.stringify({ ImportPath: "dependency" }),
          stderr: "",
          status: 0,
        };
      },
    });
    expect(result?.graph?.nodes.size).toBe(2);
    expect(result?.graph?.edges).toHaveLength(1);
  });

  test("Cargo parses typed package and resolution metadata", () => {
    const result = resolveNative({
      candidate: { ...candidate, language: { id: "rust" } },
      snapshot,
      run: () => ({
        stdout: JSON.stringify({
          packages: [
            {
              id: "app",
              name: "app",
              version: "1.0.0",
              manifest_path: "/repo/Cargo.toml",
              source: null,
            },
          ],
          workspace_members: ["app"],
          resolve: { root: "app", nodes: [{ id: "app", deps: [] }] },
        }),
        stderr: "",
        status: 0,
      }),
    });
    expect(result?.graph?.roots).toHaveLength(1);
  });

  test("resolvers are told the project root", () => {
    expect.assertions(1);
    resolveNative({
      candidate,
      snapshot,
      run: ({ root }) => {
        expect(root).toBe("/repo");
        return { stdout: "", stderr: "", status: 1 };
      },
    });
  });
});
