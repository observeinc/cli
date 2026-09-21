import type { DependencyScope, Diagnostic } from "../types";

export type GraphCompleteness =
  | "resolved-graph"
  | "partial-graph"
  | "inventory-only";

export type PackageId = string;

export interface PackageSource {
  kind: "registry" | "workspace" | "path" | "git" | "unknown";
  location?: string;
}

export interface PackageNode {
  id: PackageId;
  name: string;
  version?: string;
  purl?: string;
  source: PackageSource;
  workspace?: boolean;
}

export interface DependencyEdge {
  from: PackageId;
  to: PackageId;
  kind: DependencyScope;
  optional: boolean;
  condition?: string;
  extras?: string[];
}

export interface GraphProvenance {
  provider: string;
  path: string;
  tool?: string;
  toolVersion?: string;
}

export interface DependencyGraph {
  roots: PackageId[];
  nodes: Map<PackageId, PackageNode>;
  edges: DependencyEdge[];
  completeness: GraphCompleteness;
  provenance: GraphProvenance;
  diagnostics: Diagnostic[];
}

export interface DependencyPath {
  node: PackageNode;
  depth: number;
  path: PackageId[];
  parents: PackageId[];
  optional: boolean;
}

export function packageId({
  ecosystem,
  name,
  version,
  source,
}: {
  ecosystem: string;
  name: string;
  version?: string;
  source?: PackageSource;
}) {
  const qualifier = source?.location
    ? `?source=${encodeURIComponent(source.location)}`
    : "";
  return `${ecosystem}:${name.toLowerCase()}@${version ?? "unknown"}${qualifier}`;
}
