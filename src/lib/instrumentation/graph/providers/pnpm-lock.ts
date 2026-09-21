import { posix } from "node:path";
import { parse as parseYaml } from "yaml";
import type { DependencyGraphProvider, GraphBuildInput } from "../provider";
import {
  packageId,
  type DependencyEdge,
  type DependencyGraph,
  type PackageNode,
} from "../types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalize(name: string) {
  return name.toLowerCase();
}

function cleanVersion(raw: string) {
  return raw.replace(/^npm:/, "").replace(/^\//, "").replace(/\(.*$/, "");
}

export const pnpmLockProvider: DependencyGraphProvider = {
  id: "pnpm-lock",
  supports({ candidate, snapshot }) {
    return (
      candidate.language.id === "nodejs" &&
      findLock(candidate.path, snapshot.files) != null
    );
  },
  build(input) {
    return buildPnpmGraph(input);
  },
};

export function buildPnpmGraph({
  candidate,
  snapshot,
}: GraphBuildInput): DependencyGraph | null {
  const lock = findLock(candidate.path, snapshot.files);
  if (lock?.content == null) return null;
  let root: Record<string, unknown> | null;
  try {
    root = asRecord(parseYaml(lock.content));
  } catch {
    return null;
  }
  const importers = asRecord(root?.importers);
  if (root == null || importers == null) return null;
  const lockDirectory =
    posix.dirname(lock.path) === "." ? "." : posix.dirname(lock.path);
  const importerName =
    lockDirectory === "."
      ? candidate.path
      : posix.relative(lockDirectory, candidate.path) || ".";
  const importer = asRecord(importers[importerName]);
  if (importer == null) return null;

  const nodes = new Map<string, PackageNode>();
  const edges: DependencyEdge[] = [];
  const expandedImporters = new Set<string>();
  const rootId = packageId({
    ecosystem: "npm",
    name: candidate.name,
    version: "workspace",
    source: { kind: "workspace", location: importerName },
  });
  nodes.set(rootId, {
    id: rootId,
    name: normalize(candidate.name),
    source: { kind: "workspace", location: importerName },
    workspace: true,
  });

  const packageEntries =
    asRecord(root.snapshots) ?? asRecord(root.packages) ?? {};
  const packageIds = new Map<string, string>();
  let incomplete = false;
  for (const key of Object.keys(packageEntries)) {
    const parsed = parsePackageKey(key);
    if (parsed == null) continue;
    const id = packageId({
      ecosystem: "npm",
      name: parsed.name,
      version: parsed.version,
      source: { kind: "registry" },
    });
    nodes.set(id, {
      id,
      name: parsed.name,
      version: parsed.version,
      purl: `pkg:npm/${encodeURIComponent(parsed.name)}@${parsed.version}`,
      source: { kind: "registry" },
    });
    packageIds.set(key, id);
    packageIds.set(`${parsed.name}@${parsed.version}`, id);
  }

  // Build edges only after every package key is indexed; snapshots can refer
  // to packages that appear later in the YAML mapping.
  for (const [key, raw] of Object.entries(packageEntries)) {
    const parsed = parsePackageKey(key);
    const from =
      parsed == null
        ? undefined
        : packageIds.get(`${parsed.name}@${parsed.version}`);
    const pkg = asRecord(raw);
    if (from == null || pkg == null) continue;
    incomplete =
      addSection({
        from,
        section: pkg.dependencies,
        kind: "runtime",
        nodes,
        edges,
        packageIds,
        importers,
        importerName,
        expandedImporters,
      }) || incomplete;
    incomplete =
      addSection({
        from,
        section: pkg.optionalDependencies,
        kind: "optional",
        nodes,
        edges,
        packageIds,
        importers,
        importerName,
        expandedImporters,
      }) || incomplete;
    incomplete =
      addSection({
        from,
        section: pkg.peerDependencies,
        kind: "peer",
        nodes,
        edges,
        packageIds,
        importers,
        importerName,
        expandedImporters,
      }) || incomplete;
  }

  incomplete =
    addImporterEdges({
      from: rootId,
      importer,
      importerName,
      nodes,
      edges,
      packageIds,
      importers,
      expandedImporters,
    }) || incomplete;

  return {
    roots: [rootId],
    nodes,
    edges,
    completeness: incomplete ? "partial-graph" : "resolved-graph",
    provenance: { provider: "pnpm-lock", path: lock.path },
    diagnostics: incomplete
      ? [
          {
            code: "PNPM_GRAPH_INCOMPLETE",
            severity: "warning",
            message: "Some locked dependency references could not be resolved",
            path: lock.path,
          },
        ]
      : [],
  };
}

function addSection({
  from,
  section,
  kind,
  nodes,
  edges,
  packageIds,
  importers,
  importerName,
  expandedImporters,
}: {
  from: string;
  section: unknown;
  kind: "runtime" | "development" | "optional" | "peer";
  nodes: Map<string, PackageNode>;
  edges: DependencyEdge[];
  packageIds: Map<string, string>;
  importers: Record<string, unknown>;
  importerName: string;
  expandedImporters: Set<string>;
}): boolean {
  let incomplete = false;
  for (const [name, raw] of Object.entries(asRecord(section) ?? {})) {
    const record = asRecord(raw);
    const selected = typeof raw === "string" ? raw : record?.version;
    const specifier =
      typeof record?.specifier === "string" ? record.specifier : undefined;
    if (typeof selected !== "string") {
      incomplete = true;
      continue;
    }
    let target: string | undefined;
    if (
      /^(?:workspace:|link:|file:)/.test(selected) ||
      specifier?.startsWith("workspace:") === true
    ) {
      const location =
        selected.startsWith("link:") || selected.startsWith("file:")
          ? selected.replace(/^(?:link:|file:)/, "")
          : name;
      const resolvedPath = posix.normalize(posix.join(importerName, location));
      const importerKey = Object.keys(importers).find(
        (key) => posix.normalize(key) === resolvedPath,
      );
      if (importerKey != null) {
        target = packageId({
          ecosystem: "npm",
          name,
          version: "workspace",
          source: { kind: "workspace", location: importerKey },
        });
        if (!nodes.has(target))
          nodes.set(target, {
            id: target,
            name: normalize(name),
            source: { kind: "workspace", location: importerKey },
            workspace: true,
          });
      }
    } else {
      const version = cleanVersion(selected);
      target =
        packageIds.get(`${name}@${version}`) ??
        [...nodes.values()].find(
          (node) => node.name === normalize(name) && node.version === version,
        )?.id;
    }
    if (target != null) {
      edges.push({ from, to: target, kind, optional: kind === "optional" });
      const targetImporter = nodes.get(target)?.source.location;
      if (targetImporter != null && !expandedImporters.has(targetImporter)) {
        const importerRecord = asRecord(importers[targetImporter]);
        if (importerRecord != null) {
          expandedImporters.add(targetImporter);
          incomplete =
            addImporterEdges({
              from: target,
              importer: importerRecord,
              importerName: targetImporter,
              nodes,
              edges,
              packageIds,
              importers,
              expandedImporters,
            }) || incomplete;
        }
      }
    } else incomplete = true;
  }
  return incomplete;
}

function addImporterEdges({
  from,
  importer,
  importerName,
  nodes,
  edges,
  packageIds,
  importers,
  expandedImporters,
}: {
  from: string;
  importer: Record<string, unknown>;
  importerName: string;
  nodes: Map<string, PackageNode>;
  edges: DependencyEdge[];
  packageIds: Map<string, string>;
  importers: Record<string, unknown>;
  expandedImporters: Set<string>;
}): boolean {
  let incomplete = false;
  expandedImporters.add(importerName);
  for (const [section, kind] of [
    ["dependencies", "runtime"],
    ["optionalDependencies", "optional"],
    ["peerDependencies", "peer"],
    ["devDependencies", "development"],
  ] as const)
    incomplete =
      addSection({
        from,
        section: importer[section],
        kind,
        nodes,
        edges,
        packageIds,
        importers,
        importerName,
        expandedImporters,
      }) || incomplete;
  return incomplete;
}

function parsePackageKey(key: string) {
  const cleaned = key.replace(/^\//, "").replace(/\(.*$/, "");
  const match =
    /^((?:@[^/]+\/)?[^@]+)@(.+)$/.exec(cleaned) ??
    /^((?:@[^/]+\/)?[^/]+)\/(.+)$/.exec(cleaned);
  return match?.[1] == null || match[2] == null
    ? null
    : { name: normalize(match[1]), version: cleanVersion(match[2]) };
}

function findLock(
  candidatePath: string,
  files: { path: string; content?: string }[],
) {
  const parts = candidatePath === "." ? [] : candidatePath.split("/");
  for (;;) {
    const directory = parts.length === 0 ? "." : parts.join("/");
    const path =
      directory === "." ? "pnpm-lock.yaml" : `${directory}/pnpm-lock.yaml`;
    const lock = files.find((file) => file.path === path);
    if (lock != null) return lock;
    if (parts.length === 0) return null;
    parts.pop();
  }
}
