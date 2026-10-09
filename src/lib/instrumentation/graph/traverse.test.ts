import { describe, expect, test } from "bun:test";
import { runtimeClosure } from "./traverse";
import type { DependencyGraph, PackageNode } from "./types";

const node = (id: string): PackageNode => ({
  id,
  name: id,
  version: "1",
  source: { kind: "registry" },
});

describe("runtimeClosure", () => {
  test("required paths override optional paths independently of edge order", () => {
    const graph: DependencyGraph = {
      roots: ["app"],
      nodes: new Map(["app", "a", "b", "c", "d"].map((id) => [id, node(id)])),
      edges: [
        { from: "app", to: "a", kind: "optional", optional: true },
        { from: "app", to: "b", kind: "runtime", optional: false },
        { from: "a", to: "c", kind: "runtime", optional: false },
        { from: "b", to: "c", kind: "runtime", optional: false },
        { from: "c", to: "d", kind: "runtime", optional: false },
      ],
      completeness: "resolved-graph",
      provenance: { provider: "test", path: "lock" },
      diagnostics: [],
    };
    const first = runtimeClosure(graph);
    graph.edges.reverse();
    expect(runtimeClosure(graph)).toEqual(first);
    expect(first.find((item) => item.node.id === "d")?.optional).toBe(false);
  });
  test("keeps shortest paths, parents, optionality, and ignores dev edges", () => {
    const graph: DependencyGraph = {
      roots: ["app"],
      nodes: new Map(["app", "a", "b", "c", "dev"].map((id) => [id, node(id)])),
      edges: [
        { from: "app", to: "a", kind: "runtime", optional: false },
        { from: "app", to: "b", kind: "optional", optional: true },
        { from: "a", to: "c", kind: "runtime", optional: false },
        { from: "b", to: "c", kind: "runtime", optional: false },
        { from: "app", to: "dev", kind: "development", optional: false },
        { from: "c", to: "a", kind: "runtime", optional: false },
      ],
      completeness: "resolved-graph",
      provenance: { provider: "test", path: "lock" },
      diagnostics: [],
    };
    const closure = runtimeClosure(graph);
    expect(closure.map((item) => item.node.id)).toEqual(["a", "b", "c"]);
    expect(
      closure.find((item) => item.node.id === "c")?.parents.sort(),
    ).toEqual(["a", "b"]);
    expect(closure.find((item) => item.node.id === "b")?.optional).toBe(true);
  });
});
