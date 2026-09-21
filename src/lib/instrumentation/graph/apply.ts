import { dependencyCategory } from "../detectors/common";
import type { CandidateApplication } from "../types";
import { runtimeClosure } from "./traverse";
import type { DependencyGraph } from "./types";

export function applyGraph({
  candidate,
  graph,
}: {
  candidate: CandidateApplication;
  graph: DependencyGraph;
}) {
  const closure = runtimeClosure(graph);
  const dependencies = new Map<
    string,
    CandidateApplication["dependencies"][number]
  >();
  const preserveDeclared =
    closure.length === 0 || graph.completeness !== "resolved-graph";
  if (preserveDeclared)
    for (const dependency of candidate.dependencies)
      dependencies.set(
        `${dependency.name.toLowerCase()}@${dependency.resolvedVersion ?? dependency.version ?? "unknown"}`,
        dependency,
      );
  for (const item of closure) {
    const path = item.path.map((id) => graph.nodes.get(id)?.name ?? id);
    const key = `${item.node.name.toLowerCase()}@${item.node.version ?? "unknown"}`;
    const existing = dependencies.get(key);
    if (existing != null) {
      existing.optional = existing.optional && item.optional;
      existing.paths = [...(existing.paths ?? []), path];
      if ((existing.depth ?? Number.MAX_SAFE_INTEGER) > item.depth) {
        existing.depth = item.depth;
        existing.via = path.slice(1, -1);
      }
      continue;
    }
    dependencies.set(key, {
      name: item.node.name,
      version: item.node.version,
      resolvedVersion: item.node.version,
      scope: "runtime",
      optional: item.optional,
      sourceKind: "lockfile",
      purl: item.node.purl,
      category: dependencyCategory(item.node.name),
      depth: item.depth,
      via: path.slice(1, -1),
      paths: [path],
    });
  }
  candidate.dependencies = [...dependencies.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  candidate.diagnostics.push(...graph.diagnostics);
  candidate.dependencyGraph = {
    completeness: graph.completeness,
    provenance: graph.provenance,
    root: graph.roots[0] ?? "",
    nodeCount: graph.nodes.size,
    edgeCount: graph.edges.length,
  };
  if (!candidate.lockfiles.includes(graph.provenance.path))
    candidate.lockfiles.push(graph.provenance.path);
  if (
    !candidate.evidence.some(
      (item) => item.kind === "lockfile" && item.path === graph.provenance.path,
    )
  )
    candidate.evidence.push({ kind: "lockfile", path: graph.provenance.path });
}
