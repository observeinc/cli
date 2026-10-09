import { posix } from "node:path";
import Arborist from "@npmcli/arborist";
import type { GraphBuildInput } from "../provider";
import {
  packageId,
  type DependencyEdge,
  type DependencyGraph,
  type PackageNode,
} from "../types";
import { fileAt } from "../../file-index";

interface ArboristEdge {
  name: string;
  type: "prod" | "dev" | "optional" | "peer" | "peerOptional" | "workspace";
  to: ArboristNode | null;
}

interface ArboristNode {
  name: string;
  version?: string;
  location: string;
  isLink?: boolean;
  /** For a link, the package it points at (a workspace or `file:` package). */
  target?: ArboristNode | null;
  edgesOut: Map<string, ArboristEdge>;
  inventory: Map<string, ArboristNode>;
}

export const npmArboristProvider = {
  id: "npm-arborist",
  supports({ candidate, snapshot }: GraphBuildInput) {
    return (
      candidate.language.id === "nodejs" &&
      fileAt(snapshot.files, local(candidate.path, "package-lock.json")) != null
    );
  },
  async build({ candidate, snapshot }: GraphBuildInput) {
    const lock = fileAt(
      snapshot.files,
      local(candidate.path, "package-lock.json"),
    );
    if (lock == null) return null;
    try {
      const absolute =
        snapshot.root === "/"
          ? `/${candidate.path}`
          : posix.join(
              snapshot.root,
              candidate.path === "." ? "" : candidate.path,
            );
      const tree = (await new Arborist({
        path: absolute,
      }).loadVirtual()) as ArboristNode;
      return fromArborist(tree, lock.path);
    } catch {
      return null;
    }
  },
};

export async function buildNpmArboristGraph(input: GraphBuildInput) {
  if (!npmArboristProvider.supports(input)) return null;
  return npmArboristProvider.build(input);
}

function fromArborist(tree: ArboristNode, path: string): DependencyGraph {
  const nodes = new Map<string, PackageNode>();
  const idByLocation = new Map<string, string>();
  const inventory = [...tree.inventory.values()];
  // A workspace or `file:` dependency is a Link at node_modules/<name> whose
  // target is the real package; the Link itself has no outgoing edges. Treat
  // the link and its target as one node so traversal continues into the
  // target's dependencies.
  const linkTargets = new Set(
    inventory.flatMap((raw) =>
      raw.isLink && raw.target != null ? [raw.target.location] : [],
    ),
  );
  for (const raw of [tree, ...inventory]) {
    if (raw.isLink && raw.target != null) continue;
    const workspace = Boolean(raw.isLink) || linkTargets.has(raw.location);
    const source = workspace
      ? { kind: "workspace" as const, location: raw.location }
      : { kind: "registry" as const };
    const id = packageId({
      ecosystem: "npm",
      name: raw.name || "root",
      version: raw.version,
      source,
    });
    idByLocation.set(raw.location, id);
    nodes.set(id, {
      id,
      name: raw.name || "root",
      version: raw.version,
      purl: raw.version
        ? `pkg:npm/${encodeURIComponent(raw.name)}@${raw.version}`
        : undefined,
      source,
      workspace,
    });
  }
  for (const raw of inventory)
    if (raw.isLink && raw.target != null) {
      const target = idByLocation.get(raw.target.location);
      if (target != null) idByLocation.set(raw.location, target);
    }
  const edges: DependencyEdge[] = [];
  for (const raw of [tree, ...inventory]) {
    if (raw.isLink && raw.target != null) continue;
    const from = idByLocation.get(raw.location);
    if (from == null) continue;
    for (const edge of raw.edgesOut.values()) {
      if (edge.to == null) continue;
      const to = idByLocation.get(edge.to.location);
      if (to == null) continue;
      edges.push({
        from,
        to,
        kind: edgeKind(edge.type),
        optional: edge.type === "optional" || edge.type === "peerOptional",
      });
    }
  }
  const root = idByLocation.get(tree.location);
  if (root == null) throw new Error("Arborist graph has no root");
  return {
    roots: [root],
    nodes,
    edges,
    completeness: "resolved-graph",
    provenance: { provider: "npm-arborist", path },
    diagnostics: [],
  };
}

function edgeKind(type: ArboristEdge["type"]) {
  switch (type) {
    case "dev":
      return "development" as const;
    case "peer":
    case "peerOptional":
      return "peer" as const;
    case "optional":
      return "optional" as const;
    case "workspace":
    case "prod":
      return "runtime" as const;
  }
}

function local(directory: string, basename: string) {
  return directory === "." ? basename : `${directory}/${basename}`;
}
