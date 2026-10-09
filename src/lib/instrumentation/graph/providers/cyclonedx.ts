import { readFileSync } from "node:fs";
import type { Diagnostic } from "../../types";
import type { DependencyGraph } from "../types";
import { packageId, type DependencyEdge, type PackageNode } from "../types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function loadCycloneDx(path: string): DependencyGraph {
  const document = JSON.parse(readFileSync(path, "utf8")) as unknown;
  return parseCycloneDx(document, path);
}

export function parseCycloneDx(
  document: unknown,
  path = "bom.cdx.json",
): DependencyGraph {
  const root = asRecord(document);
  if (root?.bomFormat !== "CycloneDX" || typeof root.specVersion !== "string")
    throw new Error("Not a CycloneDX JSON document");
  const components: unknown[] = Array.isArray(root.components)
    ? root.components
    : [];
  const metadataComponent = asRecord(asRecord(root.metadata)?.component);
  const all =
    metadataComponent == null ? components : [metadataComponent, ...components];
  const nodes = new Map<string, PackageNode>();
  const idByRef = new Map<string, string>();
  for (const raw of all) {
    const component = asRecord(raw);
    if (component == null) continue;
    const ref = component["bom-ref"];
    const name = component.name;
    if (typeof ref !== "string" || typeof name !== "string") continue;
    if (idByRef.has(ref))
      throw new Error(`Duplicate CycloneDX bom-ref: ${ref}`);
    const version =
      typeof component.version === "string" ? component.version : undefined;
    const id =
      typeof component.purl === "string"
        ? component.purl
        : packageId({
            ecosystem: "cdx",
            name,
            version,
            source: { kind: "unknown" },
          });
    idByRef.set(ref, id);
    nodes.set(id, {
      id,
      name,
      version,
      purl: typeof component.purl === "string" ? component.purl : undefined,
      source: { kind: "unknown" },
    });
  }
  const edges: DependencyEdge[] = [];
  const diagnostics: Diagnostic[] = [];
  const dependencies: unknown[] = Array.isArray(root.dependencies)
    ? root.dependencies
    : [];
  const unresolved = () =>
    diagnostics.push({
      code: "SBOM_DANGLING_REF",
      severity: "warning",
      message: "SBOM contains an unresolved dependency reference",
      path,
    });
  for (const raw of dependencies) {
    const dependency = asRecord(raw);
    if (dependency == null) continue;
    const from =
      typeof dependency.ref === "string"
        ? idByRef.get(dependency.ref)
        : undefined;
    if (from == null) {
      unresolved();
      continue;
    }
    const references: unknown[] = Array.isArray(dependency.dependsOn)
      ? dependency.dependsOn
      : [];
    for (const ref of references) {
      const to = typeof ref === "string" ? idByRef.get(ref) : undefined;
      if (to == null) {
        unresolved();
        continue;
      }
      edges.push({ from, to, kind: "runtime", optional: false });
    }
  }
  const rootRef = metadataComponent?.["bom-ref"];
  let graphRoot =
    typeof rootRef === "string" ? idByRef.get(rootRef) : undefined;
  const inventoryOnly = graphRoot == null || dependencies.length === 0;
  if (inventoryOnly) {
    graphRoot = "cyclonedx:inventory-root";
    while (nodes.has(graphRoot)) graphRoot += ":root";
    for (const node of nodes.values())
      edges.push({
        from: graphRoot,
        to: node.id,
        kind: "runtime",
        optional: false,
      });
    nodes.set(graphRoot, {
      id: graphRoot,
      name: "SBOM inventory",
      source: { kind: "unknown" },
    });
  }
  return {
    roots: graphRoot == null ? [] : [graphRoot],
    nodes,
    edges,
    completeness: inventoryOnly
      ? "inventory-only"
      : diagnostics.length > 0
        ? "partial-graph"
        : "resolved-graph",
    provenance: { provider: "cyclonedx", path },
    diagnostics,
  };
}
