import type {
  DependencyEdge,
  DependencyGraph,
  DependencyPath,
  PackageId,
} from "./types";

const RUNTIME_KINDS = new Set(["runtime", "peer", "optional", "unknown"]);

/** Return the shortest runtime path from any graph root to every reachable node. */
export function runtimeClosure(graph: DependencyGraph): DependencyPath[] {
  const outgoing = new Map<PackageId, DependencyEdge[]>();
  for (const edge of graph.edges) {
    if (!RUNTIME_KINDS.has(edge.kind)) continue;
    const list = outgoing.get(edge.from) ?? [];
    list.push(edge);
    outgoing.set(edge.from, list);
  }

  const paths = new Map<PackageId, DependencyPath>();
  const queue = [...graph.roots]
    .sort()
    .map((root) => ({ id: root, path: [root], optional: false }));
  for (const edges of outgoing.values())
    edges.sort(
      (left, right) =>
        left.to.localeCompare(right.to) ||
        Number(left.optional) - Number(right.optional),
    );
  for (const root of graph.roots) {
    const node = graph.nodes.get(root);
    if (node != null)
      paths.set(root, {
        node,
        depth: 0,
        path: [root],
        parents: [],
        optional: false,
      });
  }

  for (const current of queue) {
    for (const edge of outgoing.get(current.id) ?? []) {
      const node = graph.nodes.get(edge.to);
      if (node == null) continue;
      const nextPath = [...current.path, edge.to];
      const existing = paths.get(edge.to);
      const optional = current.optional || edge.optional;
      if (existing != null) {
        if (!existing.parents.includes(edge.from))
          existing.parents.push(edge.from);
        if (existing.optional && !optional) {
          existing.optional = false;
          queue.push({ id: edge.to, path: existing.path, optional: false });
        }
        continue;
      }
      const resolved: DependencyPath = {
        node,
        depth: nextPath.length - 1,
        path: nextPath,
        parents: [edge.from],
        optional,
      };
      paths.set(edge.to, resolved);
      queue.push({ id: edge.to, path: nextPath, optional: resolved.optional });
    }
  }

  return [...paths.values()]
    .filter((item) => item.depth > 0)
    .map((item) => ({ ...item, parents: item.parents.sort() }))
    .sort(
      (left, right) =>
        left.depth - right.depth ||
        left.node.name.localeCompare(right.node.name),
    );
}
