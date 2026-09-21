import { describe, expect, test } from "bun:test";
import { buildPnpmGraph } from "./pnpm-lock";
import { runtimeClosure } from "../traverse";
import type { CandidateApplication } from "../../types";

const candidate = {
  id: "nodejs:apps/api",
  path: "apps/api",
  name: "api",
  language: { id: "nodejs" },
  runtime: { id: "node" },
  frameworks: [],
  lockfiles: [],
  entrypoints: [],
  dependencies: [],
  testFrameworks: [],
  containerFiles: [],
  deploymentFiles: [],
  evidence: [],
  diagnostics: [],
} satisfies CandidateApplication;

const lock = `
lockfileVersion: '9.0'
importers:
  apps/api:
    dependencies:
      wrapper:
        specifier: workspace:*
        version: link:../../packages/wrapper
  packages/wrapper:
    dependencies:
      fastify:
        specifier: ^5
        version: 5.2.0
snapshots:
  fastify@5.2.0:
    dependencies:
      avvio: 9.1.0
  avvio@9.1.0: {}
`;

describe("pnpmLockProvider", () => {
  test("unresolved workspace links are partial, not silently resolved", () => {
    const content = lock.replace(
      "link:../../packages/wrapper",
      "link:../../packages/missing",
    );
    const graph = buildPnpmGraph({
      candidate,
      snapshot: {
        root: "/repo",
        diagnostics: [],
        files: [{ path: "pnpm-lock.yaml", size: content.length, content }],
        completeness: {
          filesSeen: 1,
          directoriesSeen: 1,
          manifestsSeen: 1,
          lockfilesSeen: 1,
          filesSkippedBySize: 0,
          unreadableFiles: 0,
          permissionErrors: 0,
          limitReached: false,
        },
      },
    });
    expect(graph?.completeness).toBe("partial-graph");
    expect(graph?.diagnostics[0]?.code).toBe("PNPM_GRAPH_INCOMPLETE");
  });

  test.each(["wrapper", "@org/wrapper"])(
    "traverses workspace %s and package snapshot edges",
    (name) => {
      const content = lock.replace("      wrapper:", `      '${name}':`);
      const graph = buildPnpmGraph({
        candidate,
        snapshot: {
          root: "/repo",
          diagnostics: [],
          files: [{ path: "pnpm-lock.yaml", size: content.length, content }],
          completeness: {
            filesSeen: 1,
            directoriesSeen: 1,
            manifestsSeen: 1,
            manifestsParsed: 0,
            manifestsFailed: 0,
            lockfilesSeen: 1,
            filesSkippedBySize: 0,
            unreadableFiles: 0,
            permissionErrors: 0,
            limitReached: false,
          },
        },
      })!;
      const closure = runtimeClosure(graph);
      expect(closure.map((item) => item.node.name)).toEqual([
        name,
        "fastify",
        "avvio",
      ]);
      expect(graph.completeness).toBe("resolved-graph");
      expect(closure.find((item) => item.node.name === "fastify")?.depth).toBe(
        2,
      );
    },
  );
});
