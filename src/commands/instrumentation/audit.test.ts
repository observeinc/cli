import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMockContext, suppressAnsiColor } from "../../test-helpers";
import type { ProjectSnapshot } from "../../lib/instrumentation/snapshot";
import { audit, auditCommand, type AuditReport } from "./audit";
import { fixtureManifest } from "../../lib/instrumentation/manifest/test-support";
import {
  packageId,
  type DependencyGraph,
} from "../../lib/instrumentation/graph/types";

suppressAnsiColor();

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

function tempRoot() {
  const dir = mkdtempSync(join(tmpdir(), "obs-audit-"));
  dirs.push(dir);
  return dir;
}

function snapshot(
  root: string,
  files: Record<string, string>,
): ProjectSnapshot {
  return {
    root,
    diagnostics: [],
    completeness: {
      filesSeen: 0,
      directoriesSeen: 0,
      manifestsSeen: 0,
      manifestsParsed: 0,
      manifestsFailed: 0,
      lockfilesSeen: 0,
      filesSkippedBySize: 0,
      unreadableFiles: 0,
      permissionErrors: 0,
      limitReached: false,
    },
    files: Object.entries(files).map(([path, content]) => ({
      path,
      size: content.length,
      content,
    })),
  };
}

const cleanProject = {
  "package.json": JSON.stringify({
    name: "clean",
    engines: { node: "22" },
    scripts: { start: "node index.js" },
    dependencies: { express: "4.18.2" },
  }),
};

const brokenProject = {
  "package.json": JSON.stringify({
    name: "broken",
    engines: { node: "10" },
    scripts: { start: "node index.js" },
    dependencies: { express: "6.0.0" },
  }),
};

function dependencyGraph(provider = "test-graph"): DependencyGraph {
  const root = packageId({ ecosystem: "npm", name: "clean", version: "1" });
  const express = packageId({
    ecosystem: "npm",
    name: "express",
    version: "4.18.2",
  });
  return {
    roots: [root],
    nodes: new Map([
      [
        root,
        {
          id: root,
          name: "clean",
          version: "1",
          source: { kind: "workspace" },
        },
      ],
      [
        express,
        {
          id: express,
          name: "express",
          version: "4.18.2",
          source: { kind: "registry" },
        },
      ],
    ]),
    edges: [{ from: root, to: express, kind: "runtime", optional: false }],
    completeness: "resolved-graph",
    provenance: { provider, path: "package-lock.json" },
    diagnostics: [],
  };
}

describe("instrumentation audit command", () => {
  test.each(["json", "table"] as const)(
    "native support is retained in %s without failing for opt-in",
    async (format) => {
      const root = tempRoot();
      const manifest = fixtureManifest();
      manifest.runtimes.ruby!.packages = [
        {
          name: "mongo",
          instrumentationOptions: [
            {
              id: "native",
              instrumentation: "mongo",
              kind: "native",
              supportedVersions: ">=2.23.0",
              activation: "opt-in",
            },
          ],
        },
      ];
      const manifestPath = join(root, "manifest.json");
      writeFileSync(manifestPath, JSON.stringify(manifest));
      const { context, getExitCode, stdout } = createMockContext({ cwd: root });
      await audit.call(
        context,
        { format, manifest: manifestPath, "fail-on": "warning" },
        ".",
        {
          createSnapshot: () =>
            snapshot(root, {
              Gemfile: 'gem "mongo", "2.26.0"',
              "config.ru": "",
              ".ruby-version": "3.3.0",
            }),
        },
      );
      expect(getExitCode()).toBe(0);
      const output = stdout.join("");
      if (format === "json") {
        const result = JSON.parse(output) as AuditReport;
        expect(result.schemaVersion).toBe("7");
        const mongoFindings = result.findings.filter(
          (finding) => finding.package === "mongo",
        );
        expect(mongoFindings).toHaveLength(1);
        expect(mongoFindings[0]).toMatchObject({
          ruleId: "OTEL016",
          severity: "info",
        });
        expect(
          result.candidates[0]?.compatibility?.packages.supported[0],
        ).toMatchObject({
          activation: "opt-in",
          instrumentationOptions: [{ kind: "native", activation: "opt-in" }],
        });
      } else {
        expect(output).toContain("1/1 supported");
        expect(output).toContain("mongo");
        expect(output).toContain("enable required");
        expect(output).not.toContain("Support describes compatibility");
        expect(output).not.toContain("Activation and telemetry delivery");
        expect(output).not.toContain("Set MONGO_TRACING=true");
      }
    },
  );

  test("baseline updates cannot accept an unsuccessful analysis", async () => {
    const root = tempRoot();
    const { context, getExitCode } = createMockContext({ cwd: root });
    await audit.call(context, { "update-baseline": true }, ".", {
      createSnapshot: () => snapshot(root, {}),
    });
    expect(getExitCode()).toBe(2);
    expect(
      existsSync(join(root, ".observe/instrumentation-baseline.json")),
    ).toBe(false);
  });

  test("candidate error diagnostics override findings suppression", async () => {
    const root = tempRoot();
    const graph = dependencyGraph();
    graph.diagnostics.push({
      code: "METADATA_UNREADABLE",
      severity: "error",
      message: "Cannot analyze dependency metadata",
    });
    const { context, getExitCode, stdout } = createMockContext({ cwd: root });
    await audit.call(context, { format: "json", "fail-on": "none" }, ".", {
      createSnapshot: () => snapshot(root, cleanProject),
      buildNpmGraph: async () => graph,
    });
    expect(getExitCode()).toBe(2);
    expect((JSON.parse(stdout.join("")) as AuditReport).failed).toBe(true);
  });

  test.each(["table", "json"] as const)(
    "empty analysis fails in %s even with --fail-on none",
    async (format) => {
      const root = tempRoot();
      const { context, getExitCode, stdout } = createMockContext({ cwd: root });
      await audit.call(context, { format, "fail-on": "none" }, ".", {
        createSnapshot: () => snapshot(root, {}),
      });
      expect(getExitCode()).toBe(2);
      expect(stdout.join("")).not.toContain("No findings");
      if (format === "json")
        expect((JSON.parse(stdout.join("")) as AuditReport).failed).toBe(true);
    },
  );

  test("missing path fails analysis", async () => {
    const root = tempRoot();
    const { context, getExitCode } = createMockContext({ cwd: root });
    await audit.call(context, {}, "nonexistent");
    expect(getExitCode()).toBe(2);
  });

  test.each(["sarif", "github"] as const)(
    "baseline update preserves %s output",
    async (format) => {
      const root = tempRoot();
      const { context, getExitCode, stdout } = createMockContext({ cwd: root });
      await audit.call(context, { format, "update-baseline": true }, ".", {
        createSnapshot: () => snapshot(root, brokenProject),
      });
      expect(getExitCode()).toBe(0);
      expect(stdout.join("")).not.toContain("Wrote");
      if (format === "sarif")
        expect(
          (JSON.parse(stdout.join("")) as { version: string }).version,
        ).toBe("2.1.0");
    },
  );

  test("experimental refusal uses tool-error exit code", async () => {
    const previous = process.env.OBSERVE_CLI_EXPERIMENTAL;
    Reflect.deleteProperty(process.env, "OBSERVE_CLI_EXPERIMENTAL");
    try {
      const loaded = await auditCommand.loader();
      const action = typeof loaded === "function" ? loaded : loaded.default;
      const { context, getExitCode } = createMockContext();
      await action.call(context, {});
      expect(getExitCode()).toBe(2);
    } finally {
      if (previous != null) process.env.OBSERVE_CLI_EXPERIMENTAL = previous;
    }
  });

  test("exits 0 with no findings above the threshold", async () => {
    const root = tempRoot();
    const { context, getExitCode, stdout } = createMockContext({ cwd: root });
    await audit.call(context, { format: "json", "fail-on": "warning" }, ".", {
      createSnapshot: () => snapshot(root, cleanProject),
    });
    const report = JSON.parse(stdout.join("")) as AuditReport;
    expect(report.schemaVersion).toBe("7");
    expect(report.failed).toBe(false);
    expect(report.manifest.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(getExitCode()).toBe(0);
  });

  test("exits 1 when an error-level finding exists", async () => {
    const root = tempRoot();
    const { context, getExitCode, stdout } = createMockContext({ cwd: root });
    await audit.call(context, { format: "json" }, ".", {
      createSnapshot: () => snapshot(root, brokenProject),
    });
    const report = JSON.parse(stdout.join("")) as AuditReport;
    expect(report.findings.map((f) => f.ruleId)).toContain("OTEL002");
    expect(report.failed).toBe(true);
    expect(getExitCode()).toBe(1);
  });

  test("--fail-on none never fails", async () => {
    const root = tempRoot();
    const { context, getExitCode } = createMockContext({ cwd: root });
    await audit.call(context, { format: "json", "fail-on": "none" }, ".", {
      createSnapshot: () => snapshot(root, brokenProject),
    });
    expect(getExitCode()).toBe(0);
  });

  test("exits 2 on a tool error", async () => {
    const root = tempRoot();
    const { context, getExitCode, stderr } = createMockContext({ cwd: root });
    await audit.call(context, { format: "json", app: "nope" }, ".", {
      createSnapshot: () => snapshot(root, cleanProject),
    });
    expect(getExitCode()).toBe(2);
    expect(JSON.parse(stderr.join("")).error.message).toContain(
      "Candidate not found",
    );
  });

  test("exits 2 when the scan is incomplete", async () => {
    const root = tempRoot();
    const incomplete = snapshot(root, cleanProject);
    incomplete.completeness.limitReached = true;
    incomplete.diagnostics.push({
      code: "SCAN_LIMIT_REACHED",
      severity: "warning",
      message: "Stopped after reaching a scan limit",
    });
    const { context, getExitCode, stderr } = createMockContext({ cwd: root });
    await audit.call(context, { format: "json" }, ".", {
      createSnapshot: () => incomplete,
    });
    expect(getExitCode()).toBe(2);
    expect(JSON.parse(stderr.join("")).error.message).toContain(
      "Incomplete scan",
    );
  });

  test("baseline suppresses accepted findings", async () => {
    const root = tempRoot();
    const first = createMockContext({ cwd: root });
    await audit.call(
      first.context,
      { format: "json", "update-baseline": true },
      ".",
      { createSnapshot: () => snapshot(root, brokenProject) },
    );
    expect(first.getExitCode()).toBe(0);
    const baseline = JSON.parse(
      readFileSync(
        join(root, ".observe/instrumentation-baseline.json"),
        "utf8",
      ),
    ) as { findings: string[] };
    expect(baseline.findings.length).toBeGreaterThan(0);

    const second = createMockContext({ cwd: root });
    await audit.call(second.context, { format: "json" }, ".", {
      createSnapshot: () => snapshot(root, brokenProject),
    });
    const report = JSON.parse(second.stdout.join("")) as AuditReport;
    expect(report.findings).toHaveLength(0);
    expect(report.suppressed.length).toBeGreaterThan(0);
    expect(second.getExitCode()).toBe(0);
  });

  test("sarif output lists one rule per rule id and one result per finding", async () => {
    const root = tempRoot();
    const { context, stdout } = createMockContext({ cwd: root });
    await audit.call(context, { format: "sarif" }, ".", {
      createSnapshot: () => snapshot(root, brokenProject),
    });
    const sarif = JSON.parse(stdout.join("")) as {
      version: string;
      runs: {
        tool: { driver: { rules: { id: string }[] } };
        results: { ruleId: string; level: string }[];
      }[];
    };
    expect(sarif.version).toBe("2.1.0");
    const run = sarif.runs[0]!;
    const ruleIds = run.tool.driver.rules.map((r) => r.id);
    expect(new Set(ruleIds).size).toBe(ruleIds.length);
    for (const result of run.results) expect(ruleIds).toContain(result.ruleId);
    expect(run.results.some((r) => r.level === "error")).toBe(true);
  });

  test("github output emits workflow commands", async () => {
    const root = tempRoot();
    const { context, stdout } = createMockContext({ cwd: root });
    await audit.call(context, { format: "github" }, ".", {
      createSnapshot: () => snapshot(root, brokenProject),
    });
    const lines = stdout.join("").split("\n");
    expect(
      lines.some((l) =>
        l.startsWith("::error file=package.json,title=OTEL002::"),
      ),
    ).toBe(true);
  });

  test("table output lists findings with rule ids", async () => {
    const root = tempRoot();
    const { context, stdout } = createMockContext({ cwd: root });
    await audit.call(context, {}, ".", {
      createSnapshot: () => snapshot(root, brokenProject),
    });
    const output = stdout.join("");
    expect(output).toContain("OpenTelemetry instrumentation audit");
    expect(output).toContain("OTEL002");
    expect(output).toContain("OTEL010");
  });

  test("table output includes application discovery fidelity", async () => {
    const root = tempRoot();
    const input = {
      "BUILD.bazel": 'cc_binary(name = "service", srcs = ["main.cc"])',
      "main.cc": "int main() { return 0; }",
    };
    const { context, stdout } = createMockContext({ cwd: root });
    await audit.call(context, {}, ".", {
      createSnapshot: () => snapshot(root, input),
    });
    expect(stdout.join("")).toContain("discovery resolved (bazel-static)");
  });

  test("--manifest loads a local manifest and reports origin override", async () => {
    const root = tempRoot();
    const manifestPath = join(root, "manifest.json");
    writeFileSync(
      manifestPath,
      JSON.stringify({
        schemaVersion: 1,
        generatedAt: "2026-01-01T00:00:00Z",
        runtimes: {},
      }),
    );
    const { context, stdout, getExitCode } = createMockContext({ cwd: root });
    await audit.call(
      context,
      { format: "json", manifest: manifestPath, "fail-on": "none" },
      ".",
      { createSnapshot: () => snapshot(root, cleanProject) },
    );
    const report = JSON.parse(stdout.join("")) as AuditReport;
    expect(report.manifest.origin).toBe("override");
    expect(report.findings.map((f) => f.ruleId)).toContain("OTEL001");
    expect(getExitCode()).toBe(0);
  });

  test("Arborist fallback enriches an npm candidate", async () => {
    const root = tempRoot();
    const input = {
      ...cleanProject,
      "package-lock.json": JSON.stringify({ lockfileVersion: 3, packages: {} }),
    };
    const { context, stdout } = createMockContext({ cwd: root });
    await audit.call(context, { format: "json", "fail-on": "none" }, ".", {
      createSnapshot: () => snapshot(root, input),
      buildNpmGraph: async () => dependencyGraph("npm-arborist"),
    });
    const report = JSON.parse(stdout.join("")) as AuditReport;
    expect(report.candidates[0]?.dependencyGraph?.provenance.provider).toBe(
      "npm-arborist",
    );
  });

  test("--resolve applies a native graph when static resolution is unavailable", async () => {
    const root = tempRoot();
    const { context, stdout } = createMockContext({ cwd: root });
    await audit.call(
      context,
      { format: "json", resolve: true, "fail-on": "none" },
      ".",
      {
        createSnapshot: () => snapshot(root, cleanProject),
        buildNpmGraph: async () => null,
        resolveNativeGraph: () => dependencyGraph("native-test"),
      },
    );
    const report = JSON.parse(stdout.join("")) as AuditReport;
    expect(report.candidates[0]?.dependencyGraph?.provenance.provider).toBe(
      "native-test",
    );
  });

  test("--sbom replaces dependencies with the selected CycloneDX graph", async () => {
    const root = tempRoot();
    const sbom = join(root, "bom.cdx.json");
    writeFileSync(
      sbom,
      JSON.stringify({
        bomFormat: "CycloneDX",
        specVersion: "1.6",
        metadata: {
          component: { type: "application", name: "clean", "bom-ref": "app" },
        },
        components: [
          {
            type: "library",
            name: "express",
            version: "4.18.2",
            "bom-ref": "express",
          },
        ],
        dependencies: [
          { ref: "app", dependsOn: ["express"] },
          { ref: "express", dependsOn: [] },
        ],
      }),
    );
    const { context, stdout } = createMockContext({ cwd: root });
    await audit.call(
      context,
      { format: "json", app: "nodejs:.", sbom, "fail-on": "none" },
      ".",
      {
        createSnapshot: () => snapshot(root, cleanProject),
        buildNpmGraph: async () => null,
      },
    );
    const report = JSON.parse(stdout.join("")) as AuditReport;
    expect(report.candidates[0]?.dependencyGraph?.provenance.provider).toBe(
      "cyclonedx",
    );
  });

  test("a rootless empty SBOM cannot erase declared dependencies", async () => {
    const root = tempRoot();
    const sbom = join(root, "empty.cdx.json");
    writeFileSync(
      sbom,
      JSON.stringify({
        bomFormat: "CycloneDX",
        specVersion: "1.6",
        components: [],
      }),
    );
    const { context, stdout } = createMockContext({ cwd: root });
    await audit.call(context, { format: "json", sbom }, ".", {
      createSnapshot: () => snapshot(root, brokenProject),
    });
    const report = JSON.parse(stdout.join("")) as AuditReport;
    expect(
      report.candidates[0]?.dependencies.map((dependency) => dependency.name),
    ).toContain("express");
    expect(report.findings.map((finding) => finding.ruleId)).toContain(
      "OTEL010",
    );
  });
});
