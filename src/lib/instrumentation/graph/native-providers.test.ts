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
  test.each(["rust", "java", "go"] as const)(
    "%s gracefully rejects malformed stdout",
    (language) => {
      expect(
        resolveNative({
          candidate: { ...candidate, language: { id: language } },
          snapshot,
          run: () => ({ stdout: "{invalid}", stderr: "", status: 0 }),
        }),
      ).toBeNull();
    },
  );

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
    expect(result?.nodes.size).toBe(2);
    expect(result?.edges).toHaveLength(1);
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
    expect(result?.roots).toHaveLength(1);
  });

  test("Maven preserves dependency scopes", () => {
    const result = resolveNative({
      candidate: { ...candidate, language: { id: "java" } },
      snapshot,
      run: () => ({
        stdout: JSON.stringify({
          groupId: "org",
          artifactId: "app",
          version: "1.0.0",
          children: [
            {
              groupId: "org",
              artifactId: "tests",
              version: "1.0.0",
              scope: "test",
            },
          ],
        }),
        stderr: "",
        status: 0,
      }),
    });
    expect(result?.edges[0]?.kind).toBe("test");
  });
});
