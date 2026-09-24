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
  for (const raw of [tree, ...inventory]) {
    const source = raw.isLink
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
      workspace: Boolean(raw.isLink),
    });
  }
  const edges: DependencyEdge[] = [];
  for (const raw of [tree, ...inventory]) {
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
