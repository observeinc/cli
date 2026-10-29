import type { CandidateApplication } from "../types";
import { joinPath } from "../file-index";
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
  if (preserveDeclared) {
    // A declared range and the graph's resolved node for the same library
    // must merge into one dependency, not be assessed twice. The closure is
    // ordered by depth, so the first match is the shallowest (direct) node.
    const shallowest = new Map<string, string>();
    for (const item of closure) {
      const name = item.node.name.toLowerCase();
      if (item.node.version != null && !shallowest.has(name))
        shallowest.set(name, item.node.version);
    }
    for (const declared of candidate.dependencies) {
      const resolved =
        declared.resolvedVersion == null
          ? shallowest.get(declared.name.toLowerCase())
          : undefined;
      const dependency =
        resolved == null
          ? declared
          : {
              ...declared,
              resolvedVersion: resolved,
              sourceKind: "lockfile" as const,
            };
      dependencies.set(
        `${dependency.name.toLowerCase()}@${dependency.resolvedVersion ?? dependency.version ?? "unknown"}`,
        dependency,
      );
    }
  } else {
    // Framework references (Microsoft.AspNetCore.App) ship with the runtime,
    // not as packages, so a package graph never contains them.
    for (const declared of candidate.dependencies)
      if (declared.sourceKind === "framework-reference")
        dependencies.set(
          `${declared.name.toLowerCase()}@${declared.version ?? "unknown"}`,
          declared,
        );
  }
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
  // Detectors list lockfiles relative to the application directory; the graph
  // names the same file relative to the scan root.
  if (
    !candidate.lockfiles.some(
      (lockfile) =>
        lockfile === graph.provenance.path ||
        joinPath(candidate.path, lockfile) === graph.provenance.path,
    )
  )
    candidate.lockfiles.push(graph.provenance.path);
  if (
    !candidate.evidence.some(
      (item) => item.kind === "lockfile" && item.path === graph.provenance.path,
    )
  )
    candidate.evidence.push({ kind: "lockfile", path: graph.provenance.path });
}
