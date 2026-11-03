import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
        expect(result.schemaVersion).toBe("1");
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

  test("a candidate error diagnostic is an OTEL030 finding, not a tool error", async () => {
    const root = tempRoot();
    const graph = dependencyGraph();
    graph.diagnostics.push({
      code: "METADATA_UNREADABLE",
      severity: "error",
      message: "Cannot analyze dependency metadata",
    });
    const { context, getExitCode, stdout } = createMockContext({ cwd: root });
    await audit.call(context, { format: "json" }, ".", {
      createSnapshot: () => snapshot(root, cleanProject),
      buildNpmGraph: async () => graph,
    });
    expect(getExitCode()).toBe(1);
    const report = JSON.parse(stdout.join("")) as AuditReport;
    expect(report.failed).toBe(true);
    const analysis = report.findings.find(
      (finding) => finding.ruleId === "OTEL030",
    );
    expect(analysis?.severity).toBe("error");
    expect(analysis?.message).toContain("METADATA_UNREADABLE");
  });

  test("--fail-on none reports a candidate error without failing", async () => {
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
    expect(getExitCode()).toBe(0);
    const report = JSON.parse(stdout.join("")) as AuditReport;
    expect(report.failed).toBe(false);
    expect(report.findings.map((finding) => finding.ruleId)).toContain(
      "OTEL030",
    );
  });

  test("one candidate's analysis error does not stop the others", async () => {
    const root = tempRoot();
    const { context, getExitCode, stdout } = createMockContext({ cwd: root });
    await audit.call(context, { format: "json" }, ".", {
      createSnapshot: () =>
        snapshot(root, {
          "web/package.json": JSON.stringify({
            name: "web",
            scripts: { start: "node index.js" },
            dependencies: { express: "4.18.2" },
          }),
          "web/package-lock.json": JSON.stringify({
            lockfileVersion: 3,
            packages: {},
          }),
          "web/yarn.lock": "# yarn lockfile v1\n",
          "api/package.json": brokenProject["package.json"],
        }),
    });
    expect(getExitCode()).toBe(1);
    const report = JSON.parse(stdout.join("")) as AuditReport;
    expect(report.candidates.map((candidate) => candidate.path).sort()).toEqual(
      ["api", "web"],
    );
    const rules = report.findings.map(
      (finding) => `${finding.candidateId} ${finding.ruleId}`,
    );
    expect(rules).toContain("web OTEL030");
    expect(rules).toContain("api OTEL002");
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
    expect(report.schemaVersion).toBe("1");
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

  test.each(["sarif", "github"] as const)(
    "--format %s says on stderr why there is no verdict",
    async (format) => {
      const root = tempRoot();
      const { context, getExitCode, stdout, stderr } = createMockContext({
        cwd: root,
      });
      await audit.call(context, { format }, ".", {
        createSnapshot: () => snapshot(root, { "README.md": "# docs only\n" }),
      });
      expect(getExitCode()).toBe(2);
      expect(JSON.parse(stderr.join(""))).toEqual({
        error: { message: "No supported runnable application found" },
      });
      if (format === "sarif")
        expect(
          (JSON.parse(stdout.join("")) as { runs: { results: unknown[] }[] })
            .runs[0]?.results,
        ).toEqual([]);
    },
  );

  test("--format sarif writes nothing to stderr when the audit has a verdict", async () => {
    const root = tempRoot();
    const { context, stderr } = createMockContext({ cwd: root });
    await audit.call(context, { format: "sarif" }, ".", {
      createSnapshot: () => snapshot(root, cleanProject),
    });
    expect(stderr.join("")).toBe("");
  });

  test("exits 2 on a tool error", async () => {
    const root = tempRoot();
    const { context, getExitCode, stderr } = createMockContext({ cwd: root });
    await audit.call(context, { format: "json", app: "nope" }, ".", {
      createSnapshot: () => snapshot(root, cleanProject),
    });
    expect(getExitCode()).toBe(2);
    // The error names the missing id and lists the valid ones to guide the user.
    const message = JSON.parse(stderr.join("")).error.message as string;
    expect(message).toContain('No application with id "nope"');
    expect(message).toContain("use one of: .");
  });

  test("a library that does not run on the runtime is not counted as partial", async () => {
    const root = tempRoot();
    const { context, stdout } = createMockContext({ cwd: root });
    await audit.call(context, { format: "table", "fail-on": "none" }, ".", {
      createSnapshot: () =>
        snapshot(root, {
          "Worker.csproj":
            '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net48</TargetFramework></PropertyGroup><ItemGroup><PackageReference Include="MySql.Data" Version="[8.0,9.0)" /></ItemGroup></Project>',
          "Program.cs": "static class Program { static void Main() {} }",
        }),
    });
    const output = stdout.join("");
    expect(output).toContain("✗ not on this runtime");
    expect(output).toContain("Libraries  0/1 supported");
    expect(output).not.toContain("partial");
  });

  test("table output presents Go as SDK-only with instrumentation available", async () => {
    const root = tempRoot();
    const { context, stdout } = createMockContext({ cwd: root });
    await audit.call(context, { format: "table" }, ".", {
      createSnapshot: () =>
        snapshot(root, {
          "go.mod":
            "module example.com/svc\n\ngo 1.25\n\nrequire google.golang.org/grpc v1.70.0\n",
          "main.go": "package main\n\nfunc main() {}\n",
        }),
    });
    const output = stdout.join("");
    expect(output).toContain(
      "code-based auto-instrumentation for some libraries",
    );
    expect(output).toContain("1 with instrumentation available");
    expect(output).toContain("✓ supported");
    // The runtime banner conveys "manual"; it is not repeated on each row.
    expect(output).not.toContain("manual wiring");
    expect(output).not.toContain("1/1 supported");
    // Runtime metrics render as a plain "manual", not a verbose package path.
    expect(output).not.toContain("instrumentation/runtime");
  });

  test("labels an SDK-only runtime with no cataloged libraries as SDK only", async () => {
    const root = tempRoot();
    const { context, stdout } = createMockContext({ cwd: root });
    await audit.call(context, { format: "table" }, ".", {
      createSnapshot: () =>
        snapshot(root, {
          "Cargo.toml": '[package]\nname = "svc"\nversion = "0.1.0"\n',
          "src/main.rs": "fn main() {}\n",
        }),
    });
    const output = stdout.join("");
    expect(output).toContain(
      "SDK only · no instrumentation libraries cataloged",
    );
    expect(output).not.toContain("auto-instrumentation");
  });

  test("table output strips C0, DEL, and C1 control characters from untrusted names", async () => {
    const root = tempRoot();
    const { context, stdout } = createMockContext({ cwd: root });
    await audit.call(context, { format: "table" }, ".", {
      createSnapshot: () =>
        snapshot(root, {
          "package.json": JSON.stringify({
            name: "evil\u001b[2J\u009b2J\u007fname",
            scripts: { start: "node index.js" },
          }),
          "index.js": "",
        }),
    });
    const output = stdout.join("");
    expect(output).toContain("evil[2J2Jname");
    expect(output).not.toContain("\u009b");
    expect(output).not.toContain("\u007f");
  });

  test("table output strips control characters from runtime and library versions", async () => {
    const root = tempRoot();
    const files = {
      "web/package.json": JSON.stringify({
        name: "web",
        scripts: { start: "node index.js" },
        dependencies: { express: "4.18.2\u001b]0;pwned\u0007\u009b2J" },
      }),
      "web/.nvmrc": "20\u001b]0;spoof\u0007\n",
      "web/index.js": "",
      "api/package.json": JSON.stringify({
        name: "api",
        scripts: { start: "node index.js" },
      }),
      "api/index.js": "",
    };
    for (const app of [undefined, "web"]) {
      const { context, stdout } = createMockContext({ cwd: root });
      await audit.call(
        context,
        { format: "table", "fail-on": "none", ...(app ? { app } : {}) },
        ".",
        { createSnapshot: () => snapshot(root, files) },
      );
      const output = stdout.join("");
      expect(output).toContain("20]0;spoof");
      for (const control of ["\u001b]", "\u0007", "\u009b"])
        expect(output).not.toContain(control);
      if (app) expect(output).toContain("4.18.2]0;pwned2J");
    }
  });

  test("table output strips control characters from project diagnostics and errors", async () => {
    const root = tempRoot();
    const evil = "evil\u001b]0;pwned\u0007";
    const files = {
      [`${evil}/BUILD`]: "",
      [`${evil}/BUILD.bazel`]: "",
      "package.json": JSON.stringify({
        name: "web",
        scripts: { start: "node index.js" },
      }),
      "index.js": "",
    };
    const listed = createMockContext({ cwd: root });
    await audit.call(
      listed.context,
      { format: "table", "fail-on": "none" },
      ".",
      {
        createSnapshot: () => snapshot(root, files),
      },
    );
    const output = listed.stdout.join("");
    expect(output).toContain("AMBIGUOUS_BUILD_PACKAGE");
    expect(output).toContain("evil]0;pwned");

    const failed = createMockContext({ cwd: root });
    await audit.call(failed.context, { format: "table" }, ".", {
      createSnapshot: () => ({
        ...snapshot(root, files),
        diagnostics: [
          {
            code: "DIRECTORY_UNREADABLE",
            severity: "error",
            message: `Could not read directory: ${evil}`,
            path: evil,
          },
        ],
      }),
    });
    const error = failed.stderr.join("") + failed.stdout.join("");
    expect(error).toContain("Incomplete scan");
    expect(error).toContain("evil]0;pwned");
    for (const text of [output, error])
      for (const control of ["\u001b]", "\u0007"])
        expect(text).not.toContain(control);
  });

  test("groups multiple apps by runtime and collapses repeated findings", async () => {
    const root = tempRoot();
    const { context, stdout } = createMockContext({ cwd: root });
    const goModule = (name: string) =>
      `module example.com/${name}\n\ngo 1.25\n\nrequire google.golang.org/grpc v1.70.0\n`;
    await audit.call(context, { format: "table" }, ".", {
      createSnapshot: () =>
        snapshot(root, {
          "svc-a/go.mod": goModule("svc-a"),
          "svc-a/main.go": "package main\nfunc main() {}\n",
          "svc-b/go.mod": goModule("svc-b"),
          "svc-b/main.go": "package main\nfunc main() {}\n",
          "svc-c/go.mod": goModule("svc-c"),
          "svc-c/main.go": "package main\nfunc main() {}\n",
        }),
    });
    const output = stdout.join("");
    const occurrences = (needle: string) => output.split(needle).length - 1;
    // Orientation summary up top.
    expect(output).toContain("3 applications");
    expect(output).toContain("3 go");
    // Runtime facts are printed once for the group, not per app.
    expect(
      occurrences("code-based auto-instrumentation for some libraries"),
    ).toBe(1);
    expect(output).toContain("APPLICATION (use with --app)");
    for (const id of ["svc-a", "svc-b", "svc-c"]) expect(output).toContain(id);
    expect(output).toContain("--app <id>");
    // The identical OTEL004 collapses to one footer entry listing the apps,
    // so its message text appears exactly once.
    expect(occurrences("no zero-code instrumentation for go")).toBe(1);
    expect(output).toContain("3 apps · ");
  });

  test("prints long application ids whole in the last column", async () => {
    const root = tempRoot();
    const { context, stdout } = createMockContext({ cwd: root });
    const prefix =
      "services/payments/src/main/java/com/acme/platform/ingest/streaming/handlers/realtime/partitioned";
    const goModule = (name: string) =>
      `module example.com/${name}\n\ngo 1.25\n\nrequire google.golang.org/grpc v1.70.0\n`;
    await audit.call(context, { format: "table" }, ".", {
      createSnapshot: () =>
        snapshot(root, {
          [`${prefix}/streaming-ingest-unshaded/go.mod`]: goModule("a"),
          [`${prefix}/streaming-ingest-unshaded/main.go`]:
            "package main\nfunc main() {}\n",
          [`${prefix}/streaming-ingest-unshaded-e2e/go.mod`]: goModule("b"),
          [`${prefix}/streaming-ingest-unshaded-e2e/main.go`]:
            "package main\nfunc main() {}\n",
        }),
    });
    const lines = stdout
      .join("")
      // eslint-disable-next-line no-control-regex
      .replace(/\x1b\[[0-9;]*m/g, "")
      .split("\n");
    for (const id of [
      `${prefix}/streaming-ingest-unshaded`,
      `${prefix}/streaming-ingest-unshaded-e2e`,
    ]) {
      expect(id.length).toBeGreaterThan(120);
      expect(lines.some((line) => line.endsWith(`  ${id}`))).toBe(true);
    }
  });

  test("qualifies ids by language when two runtimes share a directory", async () => {
    const root = tempRoot();
    const files = {
      "svc/go.mod": "module example.com/svc\n\ngo 1.25\n",
      "svc/main.go": "package main\nfunc main() {}\n",
      "svc/package.json": JSON.stringify({
        name: "svc",
        scripts: { start: "node index.js" },
      }),
      "svc/index.js": "",
    };
    const table = createMockContext({ cwd: root });
    await audit.call(table.context, { format: "table" }, ".", {
      createSnapshot: () => snapshot(root, files),
    });
    const output = table.stdout.join("");
    expect(output).toContain("svc:go");
    expect(output).toContain("svc:nodejs");

    const selected = createMockContext({ cwd: root });
    await audit.call(selected.context, { format: "json", app: "svc:go" }, ".", {
      createSnapshot: () => snapshot(root, files),
    });
    expect(
      (
        JSON.parse(selected.stdout.join("")) as { candidates: { id: string }[] }
      ).candidates.map((candidate) => candidate.id),
    ).toEqual(["svc:go"]);

    const bare = createMockContext({ cwd: root });
    await audit.call(bare.context, { format: "json", app: "svc" }, ".", {
      createSnapshot: () => snapshot(root, files),
    });
    expect(bare.getExitCode()).toBe(2);
    expect(JSON.parse(bare.stderr.join("")).error.message).toContain(
      "use one of: svc:go, svc:nodejs",
    );
  });

  test("--app selects an application by its directory id", async () => {
    const root = tempRoot();
    const { context, stdout } = createMockContext({ cwd: root });
    await audit.call(context, { format: "json", app: "svc-a" }, ".", {
      createSnapshot: () =>
        snapshot(root, {
          "svc-a/go.mod": "module example.com/svc-a\n\ngo 1.25\n",
          "svc-a/main.go": "package main\nfunc main() {}\n",
          "svc-b/go.mod": "module example.com/svc-b\n\ngo 1.25\n",
          "svc-b/main.go": "package main\nfunc main() {}\n",
        }),
    });
    const result = JSON.parse(stdout.join("")) as {
      selection: string;
      candidates: { id: string }[];
    };
    expect(result.selection).toBe("svc-a");
    expect(result.candidates.map((candidate) => candidate.id)).toEqual([
      "svc-a",
    ]);
  });

  test("passes --exclude through to the snapshot", async () => {
    const root = tempRoot();
    let excluded: readonly string[] | undefined;
    const { context } = createMockContext({ cwd: root });
    await audit.call(
      context,
      { format: "json", exclude: ["legacy", "tools/gen"] },
      ".",
      {
        createSnapshot: (options) => {
          excluded = options.exclude;
          return snapshot(root, cleanProject);
        },
      },
    );
    expect(excluded).toEqual(["legacy", "tools/gen"]);
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

  test("exits 2 when a directory could not be read", async () => {
    const root = tempRoot();
    const partial = snapshot(root, cleanProject);
    partial.diagnostics.push({
      code: "DIRECTORY_UNREADABLE",
      severity: "error",
      message: "Could not read directory: services/billing (EACCES)",
      path: "services/billing",
    });
    const { context, getExitCode, stderr } = createMockContext({ cwd: root });
    await audit.call(context, { format: "json" }, ".", {
      createSnapshot: () => partial,
    });
    expect(getExitCode()).toBe(2);
    expect(JSON.parse(stderr.join("")).error.message).toContain(
      "services/billing",
    );
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

  test("a multi-line table error keeps its line breaks but not control characters", async () => {
    const root = tempRoot();
    const manifestPath = join(root, "bad.yaml");
    writeFileSync(manifestPath, "schemaVersion: 1\nruntimes:\n  nodejs: [\n");
    const { context, stderr, stdout, getExitCode } = createMockContext({
      cwd: root,
    });
    await audit.call(
      context,
      { format: "table", manifest: manifestPath },
      ".",
      { createSnapshot: () => snapshot(root, cleanProject) },
    );
    expect(getExitCode()).toBe(2);
    const error = stderr.join("") + stdout.join("");
    expect(error).toContain("Error:");
    expect(error.trim().split("\n").length).toBeGreaterThan(1);

    const crafted = createMockContext({ cwd: root });
    await audit.call(crafted.context, { format: "table" }, ".", {
      createSnapshot: () => {
        throw new Error("line one\u001b]0;pwned\u0007\nline two");
      },
    });
    const message = crafted.stderr.join("") + crafted.stdout.join("");
    expect(message).toContain("line one]0;pwned\nline two");
    for (const control of ["\u001b]", "\u0007"])
      expect(message).not.toContain(control);
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
        resolveNativeGraph: () => ({ graph: dependencyGraph("native-test") }),
      },
    );
    const report = JSON.parse(stdout.join("")) as AuditReport;
    expect(report.candidates[0]?.dependencyGraph?.provenance.provider).toBe(
      "native-test",
    );
  });

  test("--resolve reports why a native resolver produced no graph", async () => {
    const root = tempRoot();
    const { context, stdout } = createMockContext({ cwd: root });
    await audit.call(
      context,
      { format: "json", resolve: true, "fail-on": "none" },
      ".",
      {
        createSnapshot: () => snapshot(root, cleanProject),
        buildNpmGraph: async () => null,
        resolveNativeGraph: () => ({
          graph: null,
          diagnostic: {
            code: "RESOLVE_FAILED",
            severity: "warning",
            message: "--resolve: go list exited 1",
          },
        }),
      },
    );
    const report = JSON.parse(stdout.join("")) as AuditReport;
    expect(report.candidates[0]?.diagnostics.map((d) => d.code)).toContain(
      "RESOLVE_FAILED",
    );
    expect(report.candidates[0]?.dependencyGraph).toBeUndefined();
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
      { format: "json", app: ".", sbom, "fail-on": "none" },
      ".",
      {
        createSnapshot: () => snapshot(root, cleanProject),
        buildNpmGraph: async () => {
          throw new Error("the SBOM candidate must not build a lockfile graph");
        },
      },
    );
    const report = JSON.parse(stdout.join("")) as AuditReport;
    expect(report.candidates[0]?.dependencyGraph?.provenance.provider).toBe(
      "cyclonedx",
    );
    expect(report.candidates[0]?.lockfiles).toEqual([sbom]);
  });

  test("--sbom audits the file alone, without scanning any project", async () => {
    const root = tempRoot();
    const sbom = join(root, "bom.cdx.json");
    writeFileSync(
      sbom,
      JSON.stringify({
        bomFormat: "CycloneDX",
        specVersion: "1.6",
        metadata: {
          component: {
            type: "application",
            "bom-ref": "app",
            name: "checkout",
            purl: "pkg:npm/checkout@1.0.0",
          },
        },
        components: [
          {
            type: "library",
            "bom-ref": "e",
            name: "express",
            version: "4.19.2",
            purl: "pkg:npm/express@4.19.2",
          },
        ],
        dependencies: [
          { ref: "app", dependsOn: ["e"] },
          { ref: "e", dependsOn: [] },
        ],
      }),
    );
    const { context, getExitCode, stdout } = createMockContext({ cwd: root });
    // The SBOM is audited on its own; the filesystem is never scanned, so a
    // createSnapshot that throws proves detection does not run.
    await audit.call(
      context,
      { format: "json", sbom, "fail-on": "none" },
      undefined,
      {
        createSnapshot: () => {
          throw new Error("--sbom must not scan the filesystem");
        },
      },
    );
    expect(getExitCode()).toBe(0);
    const report = JSON.parse(stdout.join("")) as AuditReport;
    expect(report.candidates).toHaveLength(1);
    expect(report.candidates[0]?.language.id).toBe("nodejs");
    expect(report.candidates[0]?.name).toBe("checkout");
    expect(report.candidates[0]?.dependencies.map((d) => d.name)).toContain(
      "express",
    );
    expect(report.diagnostics).toHaveLength(0);
  });

  test("--sbom infers the runtime from component purls (pkg:golang → go)", async () => {
    const root = tempRoot();
    const sbom = join(root, "bom.cdx.json");
    writeFileSync(
      sbom,
      JSON.stringify({
        bomFormat: "CycloneDX",
        specVersion: "1.6",
        metadata: {
          component: {
            type: "application",
            "bom-ref": "app",
            name: "svc",
            purl: "pkg:golang/example.com/svc@1.0.0",
          },
        },
        components: [
          {
            type: "library",
            "bom-ref": "g",
            name: "google.golang.org/grpc",
            version: "1.70.0",
            purl: "pkg:golang/google.golang.org/grpc@1.70.0",
          },
        ],
        dependencies: [
          { ref: "app", dependsOn: ["g"] },
          { ref: "g", dependsOn: [] },
        ],
      }),
    );
    const { context, getExitCode, stdout } = createMockContext({ cwd: root });
    await audit.call(context, { format: "json", sbom }, undefined, {});
    expect(getExitCode()).toBe(0);
    const report = JSON.parse(stdout.join("")) as AuditReport;
    expect(report.candidates[0]?.language.id).toBe("go");
    expect(report.diagnostics).toHaveLength(0);
  });

  test("--sbom without resolvable purls asks for --app", async () => {
    const root = tempRoot();
    const sbom = join(root, "bom.cdx.json");
    writeFileSync(
      sbom,
      JSON.stringify({
        bomFormat: "CycloneDX",
        specVersion: "1.6",
        components: [],
      }),
    );
    const { context, getExitCode, stderr } = createMockContext({ cwd: root });
    await audit.call(context, { format: "json", sbom }, undefined, {});
    expect(getExitCode()).toBe(2);
    const message = JSON.parse(stderr.join("")).error.message as string;
    expect(message).toContain("Could not determine the runtime");
    expect(message).toContain("--app");
  });

  test("--app binds an SBOM to a detected app; empty SBOM keeps declared deps", async () => {
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
    // --app binds the SBOM to the detected app; a rootless empty SBOM must not
    // erase the app's declared dependencies.
    await audit.call(context, { format: "json", sbom, app: "." }, ".", {
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
