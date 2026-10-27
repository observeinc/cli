import { describe, expect, test } from "bun:test";
import { resolveNative } from "./native-providers";
import { SBOM_COMMAND } from "./providers/cyclonedx";
import type { CandidateApplication } from "../types";
import type { ProjectSnapshot } from "../snapshot";

const candidate: CandidateApplication = {
  id: ".",
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
  test("go reports malformed output instead of a graph", () => {
    const resolution = resolveNative({
      candidate: { ...candidate, language: { id: "go" } },
      snapshot,
      run: () => ({ stdout: "{invalid}", stderr: "", status: 0 }),
    });
    expect(resolution?.graph).toBeNull();
    expect(resolution?.diagnostic?.code).toBe("RESOLVE_FAILED");
  });

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
    "Java (%s) runs no build tool and points to a CycloneDX SBOM",
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
      expect(resolution?.diagnostic?.message).toContain(SBOM_COMMAND);
    },
  );

  test("a resolver exists only for Go", () => {
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

  test("Go standard-library packages are not dependencies", () => {
    const result = resolveNative({
      candidate,
      snapshot,
      run: () => ({
        stdout: [
          { ImportPath: "fmt", Standard: true },
          { ImportPath: "internal/abi", Standard: true },
          { ImportPath: "app", Name: "main", Imports: ["fmt", "dependency"] },
          { ImportPath: "dependency", Imports: ["fmt"] },
        ]
          .map((pkg) => JSON.stringify(pkg))
          .join("\n"),
        stderr: "",
        status: 0,
      }),
    });
    expect(
      [...(result?.graph?.nodes.values() ?? [])].map((node) => node.name),
    ).toEqual(["app", "dependency"]);
    expect(result?.graph?.edges).toHaveLength(1);
  });

  test("Rust is instrumented manually, so cargo is never run", () => {
    let ran = false;
    const result = resolveNative({
      candidate: { ...candidate, language: { id: "rust" } },
      snapshot,
      run: () => {
        ran = true;
        return { stdout: "", stderr: "", status: 0 };
      },
    });
    expect(result?.graph).toBeNull();
    expect(result?.diagnostic).toMatchObject({
      code: "RESOLVE_UNSUPPORTED",
      severity: "info",
    });
    expect(ran).toBe(false);
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
