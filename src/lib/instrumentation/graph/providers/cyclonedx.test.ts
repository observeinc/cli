import { describe, expect, test } from "bun:test";
import { parseCycloneDx } from "./cyclonedx";
import { runtimeClosure } from "../traverse";

describe("CycloneDX provider", () => {
  test("maps bom-ref dependencies into a rooted graph", () => {
    const graph = parseCycloneDx({
      bomFormat: "CycloneDX",
      specVersion: "1.6",
      metadata: {
        component: { type: "application", name: "app", "bom-ref": "app" },
      },
      components: [
        {
          type: "library",
          name: "fastapi",
          version: "1.0",
          purl: "pkg:pypi/fastapi@1.0",
          "bom-ref": "fastapi",
        },
      ],
      dependencies: [
        { ref: "app", dependsOn: ["fastapi"] },
        { ref: "fastapi", dependsOn: [] },
      ],
    });
    expect(graph.completeness).toBe("resolved-graph");
    expect(runtimeClosure(graph)[0]?.node.name).toBe("fastapi");
  });

  test("reports inventory-only when edges are absent", () => {
    const graph = parseCycloneDx({
      bomFormat: "CycloneDX",
      specVersion: "1.6",
      components: [
        {
          type: "library",
          name: "fastapi",
          version: "1.0",
          "bom-ref": "fastapi",
        },
      ],
    });
    expect(graph.completeness).toBe("inventory-only");
    expect(runtimeClosure(graph).map((item) => item.node.name)).toContain(
      "fastapi",
    );
  });

  test("keeps known dependencies when references are dangling", () => {
    const graph = parseCycloneDx({
      bomFormat: "CycloneDX",
      specVersion: "1.6",
      metadata: { component: { name: "app", "bom-ref": "app" } },
      components: [{ name: "fastapi", version: "1.0", "bom-ref": "fastapi" }],
      dependencies: [
        { ref: "app", dependsOn: ["missing", "fastapi"] },
        { ref: "missing", dependsOn: [] },
      ],
    });
    expect(graph.completeness).toBe("partial-graph");
    expect(graph.diagnostics).toHaveLength(2);
    expect(runtimeClosure(graph)[0]?.node.name).toBe("fastapi");
  });
});
