import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Diagnostic } from "../../types";
import type { DependencyGraph } from "../types";
import { packageId, type DependencyEdge, type PackageNode } from "../types";

/** Generates a CycloneDX SBOM for any ecosystem, for use with `--sbom`. */
export const SBOM_COMMAND = "npx @cyclonedx/cdxgen -o bom.json";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function loadCycloneDx(path: string): DependencyGraph {
  const bytes = readFileSync(path);
  const graph = parseCycloneDx(JSON.parse(bytes.toString("utf8")), path);
  graph.provenance.sha256 = createHash("sha256").update(bytes).digest("hex");
  return graph;
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
  const metadataRef = metadataComponent?.["bom-ref"];
  const all =
    metadataComponent == null ? components : [metadataComponent, ...components];
  const nodes = new Map<string, PackageNode>();
  const idByRef = new Map<string, string>();
  for (const [index, raw] of all.entries()) {
    const component = asRecord(raw);
    if (component == null) continue;
    const ref = component["bom-ref"];
    const name = component.name;
    if (typeof ref !== "string" || typeof name !== "string") continue;
    // cdxgen repeats the root component inside `components` under the same
    // bom-ref; that entry is the root, not a second component.
    if (index > 0 && metadataComponent != null && ref === metadataRef) continue;
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
