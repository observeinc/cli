import { posix } from "node:path";
import Arborist from "@npmcli/arborist";
import type { GraphBuildInput } from "../provider";
import {
  packageId,
  type DependencyEdge,
  type DependencyGraph,
  type PackageNode,
} from "../types";
import { fileAt, joinPath, nearestAncestorFile } from "../../file-index";
import type { SnapshotFile } from "../../snapshot";

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

/**
 * npm writes one lockfile at the workspace root, so a member's graph comes from
 * the nearest ancestor lockfile. Each lockfile is loaded once per snapshot.
 */
const trees = new WeakMap<SnapshotFile, Promise<ArboristNode>>();

/** An app with one of these is managed by another tool, not the npm workspace. */
const OTHER_LOCKFILES = [
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lock",
  "bun.lockb",
];

function nearestLockfile({ candidate, snapshot }: GraphBuildInput) {
  const own = fileAt(
    snapshot.files,
    joinPath(candidate.path, "package-lock.json"),
  );
  if (own != null) return own;
  const otherTool = OTHER_LOCKFILES.some(
    (name) => fileAt(snapshot.files, joinPath(candidate.path, name)) != null,
  );
  return otherTool
    ? undefined
    : nearestAncestorFile(snapshot.files, candidate.path, [
        "package-lock.json",
      ]);
}

export const npmArboristProvider = {
  id: "npm-arborist",
  supports(input: GraphBuildInput) {
    return (
      input.candidate.language.id === "nodejs" && nearestLockfile(input) != null
    );
  },
  async build(input: GraphBuildInput) {
    const { candidate, snapshot } = input;
    const lock = nearestLockfile(input);
    if (lock == null) return null;
    const lockDirectory = posix.dirname(lock.path);
    let tree = trees.get(lock);
    if (tree == null) {
      const absolute =
        lockDirectory === "."
          ? snapshot.root
          : posix.join(snapshot.root, lockDirectory);
      tree = new Arborist({
        path: absolute,
      }).loadVirtual() as Promise<ArboristNode>;
      trees.set(lock, tree);
    }
    let loaded: ArboristNode;
    try {
      loaded = await tree;
    } catch {
      // Detection already reports the app's own lockfile; only a shared
      // ancestor's is new here.
      if (lockDirectory !== candidate.path)
        candidate.diagnostics.push({
          code: "LOCKFILE_UNPARSEABLE",
          severity: "warning",
          message: `Could not parse ${lock.path}; falling back to declared version ranges`,
          path: lock.path,
        });
      return null;
    }
    // A directory the lockfile does not install (outside the workspace) has
    // no node; it keeps its declared dependencies instead of another graph.
    const rootLocation = posix.relative(
      lockDirectory === "." ? "" : lockDirectory,
      candidate.path === "." ? "" : candidate.path,
    );
    try {
      return fromArborist(loaded, lock.path, rootLocation);
    } catch {
      return null;
    }
  },
};

export async function buildNpmArboristGraph(input: GraphBuildInput) {
  if (!npmArboristProvider.supports(input)) return null;
  return npmArboristProvider.build(input);
}

function fromArborist(
  tree: ArboristNode,
  path: string,
  rootLocation: string,
): DependencyGraph | null {
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
  const root = idByLocation.get(rootLocation);
  if (root == null) return null;
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
