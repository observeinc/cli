import { posix } from "node:path";
import { parse as parseToml } from "smol-toml";
import { runtimeClosure } from "../traverse";
import type { DependencyGraphProvider, GraphBuildInput } from "../provider";
import {
  packageId,
  type DependencyEdge,
  type DependencyGraph,
  type PackageNode,
  type PackageSource,
} from "../types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalize(name: string) {
  return name.toLowerCase().replace(/_/g, "-");
}

function sourceOf(raw: unknown): PackageSource {
  const source = asRecord(raw);
  if (typeof source?.editable === "string")
    return { kind: "workspace", location: source.editable };
  if (typeof source?.virtual === "string")
    return { kind: "workspace", location: source.virtual };
  if (typeof source?.directory === "string")
    return { kind: "path", location: source.directory };
  if (typeof source?.git === "string")
    return { kind: "git", location: source.git };
  if (typeof source?.registry === "string")
    return { kind: "registry", location: source.registry };
  return { kind: "unknown" };
}

function edgeName(raw: unknown) {
  const dependency = asRecord(raw);
  return typeof dependency?.name === "string"
    ? normalize(dependency.name)
    : null;
}

function edgeExtras(raw: unknown) {
  const dependency = asRecord(raw);
  const extras = dependency?.extras ?? dependency?.extra;
  if (Array.isArray(extras))
    return extras.filter((item): item is string => typeof item === "string");
  return typeof extras === "string" ? [extras] : undefined;
}

export const uvLockProvider: DependencyGraphProvider = {
  id: "uv-lock",
  supports({ candidate, snapshot }) {
    return (
      candidate.language.id === "python" &&
      findLock(candidate.path, snapshot.files) != null
    );
  },
  build(input) {
    return buildUvGraph(input);
  },
};

export function buildUvGraph({
  candidate,
  snapshot,
}: GraphBuildInput): DependencyGraph | null {
  const lock = findLock(candidate.path, snapshot.files);
  if (lock?.content == null) return null;
  let parsed: Record<string, unknown>;
  try {
    parsed = parseToml(lock.content);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed.package)) return null;

  const nodes = new Map<string, PackageNode>();
  const rawById = new Map<string, Record<string, unknown>>();
  const byName = new Map<string, string[]>();
  for (const raw of parsed.package) {
    const pkg = asRecord(raw);
    if (typeof pkg?.name !== "string") continue;
    const version = typeof pkg.version === "string" ? pkg.version : undefined;
    const source = sourceOf(pkg.source);
    const id = packageId({
      ecosystem: "pypi",
      name: normalize(pkg.name),
      version,
      source,
    });
    const node: PackageNode = {
      id,
      name: normalize(pkg.name),
      version,
      purl:
        version == null
          ? undefined
          : `pkg:pypi/${normalize(pkg.name)}@${version}`,
      source,
      workspace: source.kind === "workspace" || source.kind === "path",
    };
    nodes.set(id, node);
    rawById.set(id, pkg);
    const ids = byName.get(node.name) ?? [];
    ids.push(id);
    byName.set(node.name, ids);
  }

  const edges: DependencyEdge[] = [];
  let incomplete = false;
  for (const [from, pkg] of rawById) {
    incomplete =
      addEdges({
        edges,
        from,
        values: pkg.dependencies,
        kind: "runtime",
        byName,
        nodes,
      }) || incomplete;
    for (const values of Object.values(asRecord(pkg["dev-dependencies"]) ?? {}))
      addEdges({ edges, from, values, kind: "development", byName, nodes });
    const metadata = asRecord(pkg.metadata);
    for (const values of Object.values(
      asRecord(metadata?.["requires-dev"]) ?? {},
    ))
      addEdges({ edges, from, values, kind: "development", byName, nodes });
  }

  const root = findRoot({
    candidateName: candidate.name,
    candidatePath: candidate.path,
    lockPath: lock.path,
    nodes,
  });
  if (root == null) return null;
  const expanded = new Set<string>();
  for (;;) {
    const reachable = new Set([
      root,
      ...runtimeClosure({
        roots: [root],
        nodes,
        edges,
        completeness: "partial-graph",
        provenance: { provider: "uv-lock", path: lock.path },
        diagnostics: [],
      }).map((item) => item.node.id),
    ]);
    const requested = edges.filter(
      (edge) =>
        reachable.has(edge.from) &&
        edge.kind !== "development" &&
        edge.extras?.length,
    );
    let changed = false;
    for (const edge of requested) {
      for (const extra of edge.extras ?? []) {
        const key = `${edge.to}:${extra}`;
        if (expanded.has(key)) continue;
        expanded.add(key);
        changed = true;
        const values = asRecord(
          rawById.get(edge.to)?.["optional-dependencies"],
        )?.[extra];
        if (!Array.isArray(values)) {
          incomplete = true;
          continue;
        }
        incomplete =
          addEdges({
            edges,
            from: edge.to,
            values,
            kind: "runtime",
            byName,
            nodes,
          }) || incomplete;
      }
    }
    if (!changed) break;
  }
  return {
    roots: [root],
    nodes,
    edges,
    completeness: incomplete ? "partial-graph" : "resolved-graph",
    provenance: { provider: "uv-lock", path: lock.path },
    diagnostics: incomplete
      ? [
          {
            code: "UV_GRAPH_INCOMPLETE",
            severity: "warning",
            message:
              "Some locked dependencies or requested extras could not be resolved",
            path: lock.path,
          },
        ]
      : [],
  };
}

function addEdges({
  edges,
  from,
  values,
  kind,
  byName,
  nodes,
}: {
  edges: DependencyEdge[];
  from: string;
  values: unknown;
  kind: "runtime" | "development";
  byName: Map<string, string[]>;
  nodes: Map<string, PackageNode>;
}) {
  if (values == null) return false;
  if (!Array.isArray(values)) return true;
  let incomplete = false;
  for (const raw of values) {
    const name = edgeName(raw);
    if (name == null) {
      incomplete = true;
      continue;
    }
    const record = asRecord(raw);
    const version =
      typeof record?.version === "string" ? record.version : undefined;
    const source = sourceOf(record?.source);
    const candidates = byName.get(name) ?? [];
    const matching = candidates.filter((id) => {
      const node = nodes.get(id);
      return (
        node != null &&
        (version == null || node.version === version) &&
        (source.kind === "unknown" || node.source.location === source.location)
      );
    });
    const target = matching.length === 1 ? matching[0] : undefined;
    if (target == null) {
      incomplete = true;
      continue;
    }
    edges.push({
      from,
      to: target,
      kind,
      optional: Boolean(record?.optional),
      condition: typeof record?.marker === "string" ? record.marker : undefined,
      extras: edgeExtras(raw),
    });
  }
  return incomplete;
}

function findRoot({
  candidateName,
  candidatePath,
  lockPath,
  nodes,
}: {
  candidateName: string;
  candidatePath: string;
  lockPath: string;
  nodes: Map<string, PackageNode>;
}) {
  const lockDirectory =
    posix.dirname(lockPath) === "." ? "." : posix.dirname(lockPath);
  const relative =
    lockDirectory === "."
      ? candidatePath
      : posix.relative(lockDirectory, candidatePath) || ".";
  const sourceMatches = [...nodes.values()].filter(
    (node) =>
      node.workspace &&
      (node.source.location === relative ||
        (relative === "." && node.source.location === ".")),
  );
  if (sourceMatches.length === 1) return sourceMatches[0]?.id ?? null;
  const name = normalize(candidateName);
  const nameMatches = [...nodes.values()].filter((node) => node.name === name);
  return nameMatches.length === 1 ? (nameMatches[0]?.id ?? null) : null;
}

function findLock(
  candidatePath: string,
  files: { path: string; content?: string }[],
) {
  const parts = candidatePath === "." ? [] : candidatePath.split("/");
  for (;;) {
    const directory = parts.length === 0 ? "." : parts.join("/");
    const path = directory === "." ? "uv.lock" : `${directory}/uv.lock`;
    const lock = files.find((file) => file.path === path);
    if (lock != null) return lock;
    if (parts.length === 0) return null;
    parts.pop();
  }
}
