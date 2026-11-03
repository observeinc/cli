import { describe, expect, test } from "bun:test";
import { createCandidate } from "../detectors/common";
import { applyGraph } from "./apply";
import { packageId, type DependencyGraph } from "./types";

function partialGraph(): DependencyGraph {
  const root = packageId({ ecosystem: "npm", name: "app", version: "1" });
  const redis = packageId({
    ecosystem: "npm",
    name: "redis",
    version: "4.6.1",
  });
  const cluster = packageId({
    ecosystem: "npm",
    name: "@redis/client",
    version: "1.5.0",
  });
  return {
    roots: [root],
    nodes: new Map([
      [
        root,
        { id: root, name: "app", version: "1", source: { kind: "workspace" } },
      ],
      [
        redis,
        {
          id: redis,
          name: "redis",
          version: "4.6.1",
          source: { kind: "registry" },
        },
      ],
      [
        cluster,
        {
          id: cluster,
          name: "@redis/client",
          version: "1.5.0",
          source: { kind: "registry" },
        },
      ],
    ]),
    edges: [
      { from: root, to: redis, kind: "runtime", optional: false },
      { from: redis, to: cluster, kind: "runtime", optional: false },
    ],
    completeness: "partial-graph",
    provenance: { provider: "test", path: "pnpm-lock.yaml" },
    diagnostics: [],
  };
}

describe("applyGraph", () => {
  test("a partial graph resolves a declared range instead of duplicating it", () => {
    const candidate = createCandidate({
      directory: ".",
      name: "app",
      language: "nodejs",
      runtime: "node",
      dependencies: [
        { name: "redis", version: "^4.0.0", scope: "runtime" },
        { name: "left-pad", version: "^1.0.0", scope: "runtime" },
      ],
    });
    applyGraph({ candidate, graph: partialGraph() });
    const redis = candidate.dependencies.filter(
      (item) => item.name === "redis",
    );
    expect(redis).toHaveLength(1);
    expect(redis[0]).toMatchObject({
      version: "^4.0.0",
      resolvedVersion: "4.6.1",
      sourceKind: "lockfile",
      depth: 1,
    });
    // Declared dependencies the partial graph does not cover are kept.
    expect(candidate.dependencies.map((item) => item.name).sort()).toEqual([
      "@redis/client",
      "left-pad",
      "redis",
    ]);
  });

  test("a complete graph replaces declared packages but keeps framework references", () => {
    const candidate = createCandidate({
      directory: ".",
      name: "api",
      language: "dotnet",
      runtime: "dotnet",
      dependencies: [
        {
          name: "Microsoft.AspNetCore.App",
          scope: "runtime",
          sourceKind: "framework-reference",
        },
        { name: "Npgsql.EntityFrameworkCore.PostgreSQL", version: "9.0.4" },
      ],
    });
    const root = packageId({ ecosystem: "nuget", name: "api", version: "1" });
    const npgsql = packageId({
      ecosystem: "nuget",
      name: "Npgsql",
      version: "9.0.3",
    });
    applyGraph({
      candidate,
      graph: {
        roots: [root],
        nodes: new Map([
          [root, { id: root, name: "api", source: { kind: "workspace" } }],
          [
            npgsql,
            {
              id: npgsql,
              name: "Npgsql",
              version: "9.0.3",
              source: { kind: "registry" },
            },
          ],
        ]),
        edges: [{ from: root, to: npgsql, kind: "runtime", optional: false }],
        completeness: "resolved-graph",
        provenance: { provider: "cyclonedx", path: "bom.json" },
        diagnostics: [],
      },
    });
    expect(candidate.dependencies.map((item) => item.name)).toEqual([
      "Microsoft.AspNetCore.App",
      "Npgsql",
    ]);
  });

  test("does not list the application's own lockfile twice", () => {
    const candidate = createCandidate({
      directory: "services/web",
      name: "web",
      language: "nodejs",
      runtime: "node",
      lockfiles: ["pnpm-lock.yaml"],
    });
    applyGraph({
      candidate,
      graph: {
        ...partialGraph(),
        provenance: { provider: "test", path: "services/web/pnpm-lock.yaml" },
      },
    });
    expect(candidate.lockfiles).toEqual(["pnpm-lock.yaml"]);
  });
});
