import { describe, expect, test } from "bun:test";
import { deriveFindings, hasFindingAtOrAbove } from "./findings";
import { detectApplications } from "./detect";
import type { ProjectSnapshot } from "./snapshot";
import { checkCompatibility } from "./manifest/check";
import { loadManifest } from "./manifest/load";
import { fixtureManifest } from "./manifest/test-support";
import { createCandidate } from "./detectors/common";

function snapshot(files: Record<string, string>): ProjectSnapshot {
  return {
    root: "/project",
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

function rulesFor(files: Record<string, string>) {
  const detection = detectApplications(snapshot(files));
  return deriveFindings({ candidates: detection.candidates }).map(
    (finding) => finding.ruleId,
  );
}

describe("deriveFindings", () => {
  test("runtime-bound framework gaps do not duplicate runtime findings", () => {
    const rules = rulesFor({
      "Api.csproj":
        '<Project Sdk="Microsoft.NET.Sdk.Web"><TargetFramework>net6.0</TargetFramework></Project>',
    });
    expect(rules).toContain("OTEL002");
    expect(rules).not.toContain("OTEL010");
  });

  test("OTEL001 for a runtime OpenTelemetry does not support", () => {
    const rules = rulesFor({ cpanfile: "requires 'Mojolicious';\n" });
    expect(rules).toEqual(["OTEL001"]);
  });

  test("OTEL004 for an SDK-only runtime", () => {
    const rules = rulesFor({
      "go.mod": "module example.com/svc\n\ngo 1.24\n",
      "main.go": "package main\n\nfunc main() {}\n",
    });
    expect(rules).toEqual(["OTEL004"]);
  });

  test("OTEL004 is a single SDK-only finding without per-library noise", () => {
    const detection = detectApplications(
      snapshot({
        "go.mod": "module example.com/svc\n\ngo 1.25\n",
        "main.go": "package main\n\nfunc main() {}\n",
      }),
    );
    const candidate = detection.candidates[0]!;
    candidate.dependencies = [
      {
        name: "github.com/gin-gonic/gin",
        version: "v1.10.0",
        scope: "runtime",
      },
    ];
    candidate.compatibility = checkCompatibility({
      candidate,
      manifest: loadManifest(),
    });
    const findings = deriveFindings({ candidates: [candidate] });
    const otel004 = findings.filter((finding) => finding.ruleId === "OTEL004");
    expect(otel004).toHaveLength(1);
    // The message stays a single line; the per-library instrumentation packages
    // live in the rendered table, not inlined into the finding.
    expect(otel004[0]?.message).toContain(
      "no zero-code instrumentation for go",
    );
    expect(otel004[0]?.message).toContain("instrumentation libraries in code");
    // SDK-only runtimes report manual libraries once, inside OTEL004: no
    // per-library OTEL017, and no OTEL015 for contrib's unpublished ranges.
    const rules = findings.map((finding) => finding.ruleId);
    expect(rules).not.toContain("OTEL017");
    expect(rules).not.toContain("OTEL015");
  });

  test("OTEL017 for a manual-only library on an auto-instrumented runtime", () => {
    const manifest = fixtureManifest();
    manifest.runtimes.ruby!.packages = [
      {
        name: "hand-wired",
        instrumentationOptions: [
          {
            id: "contrib",
            instrumentation: "hand-wired-otel",
            kind: "external",
            supportedVersions: ">=1.0.0",
            activation: "manual",
          },
        ],
      },
    ];
    const candidate = createCandidate({
      directory: ".",
      name: "app",
      language: "ruby",
      runtime: "ruby",
      version: "3.3.0",
      dependencies: [
        { name: "hand-wired", version: "1.2.0", scope: "runtime" },
      ],
    });
    candidate.compatibility = checkCompatibility({ candidate, manifest });
    const otel017 = deriveFindings({ candidates: [candidate] }).find(
      (finding) => finding.ruleId === "OTEL017",
    );
    expect(otel017?.message).toContain("hand-wired-otel must be wired into");
  });

  test("OTEL004 is not raised for an auto-instrumentable runtime", () => {
    const rules = rulesFor({
      Gemfile: "gem 'rails', '~> 8.0'\n",
      ".ruby-version": "3.3.0\n",
    });
    expect(rules).not.toContain("OTEL004");
  });

  test("OTEL031 when no dependency graph backs the assessment", () => {
    const rules = rulesFor({
      Gemfile: "gem 'rails', '~> 8.0'\n",
      ".ruby-version": "3.3.0\n",
    });
    expect(rules).toContain("OTEL031");
  });

  test("OTEL031 is not raised when a dependency graph was applied", () => {
    const detection = detectApplications(
      snapshot({
        "pyproject.toml":
          '[project]\nname = "app"\ndependencies = ["flask>=3"]\n[project.scripts]\napp = "app:main"\n',
        "uv.lock": [
          "version = 1",
          "[[package]]",
          'name = "app"',
          'version = "0.1.0"',
          'source = { editable = "." }',
          'dependencies = [{ name = "flask" }]',
          "[[package]]",
          'name = "flask"',
          'version = "3.0.3"',
          'source = { registry = "https://pypi.org/simple" }',
        ].join("\n"),
      }),
    );
    expect(detection.candidates[0]?.dependencyGraph).toBeDefined();
    expect(
      deriveFindings(detection).map((finding) => finding.ruleId),
    ).not.toContain("OTEL031");
  });

  test("OTEL002 for a runtime version below the supported range", () => {
    const rules = rulesFor({
      "package.json": JSON.stringify({
        name: "old",
        engines: { node: "12" },
        scripts: { start: "node index.js" },
      }),
    });
    expect(rules).toContain("OTEL002");
    expect(rules).not.toContain("OTEL003");
  });

  test("OTEL003 when the runtime version is not declared", () => {
    const rules = rulesFor({
      "package.json": JSON.stringify({
        name: "app",
        scripts: { start: "node index.js" },
      }),
    });
    expect(rules).toContain("OTEL003");
  });

  test("OTEL010 out of range, OTEL012 overlap, OTEL013 unverified", () => {
    const rules = rulesFor({
      "package.json": JSON.stringify({
        name: "app",
        engines: { node: "22" },
        scripts: { start: "node index.js" },
        dependencies: {
          express: "6.0.0",
          fastify: ">=2 <6",
          koa: "next",
        },
      }),
    });
    expect(rules).toContain("OTEL010");
    expect(rules).not.toContain("OTEL011");
    expect(rules).not.toContain("OTEL014");
    expect(rules).toContain("OTEL012");
    expect(rules).toContain("OTEL013");
  });

  test("missing upstream range does not blame the application's version", () => {
    const detection = detectApplications(
      snapshot({
        "package.json": JSON.stringify({
          name: "app",
          engines: { node: "22" },
          scripts: { start: "node app.js" },
        }),
      }),
    );
    const profile = detection.candidates[0]?.compatibility;
    if (profile == null) throw new Error("Missing candidate fixture");
    profile.packages.unverified.push({
      name: "example",
      declaredVersion: "1.0.0",
      instrumentationOptions: [
        {
          id: "legacy",
          instrumentation: "example-instrumentation",
          kind: "unknown",
          versionMatch: "unknown",
        },
      ],
      versionMatch: "unknown",
      unverifiedReason: "support-range-missing",
    });
    const finding = deriveFindings(detection).find(
      (item) => item.ruleId === "OTEL015",
    );
    expect(finding?.message).toContain(
      "supported library versions are unknown",
    );
    expect(finding?.fix).not.toContain("pin");
  });

  test("OTEL016 for a supported library whose native instrumentation is off by default", () => {
    const detection = detectApplications(
      snapshot({
        "package.json": JSON.stringify({
          name: "app",
          engines: { node: "22" },
          scripts: { start: "node app.js" },
        }),
      }),
    );
    const profile = detection.candidates[0]?.compatibility;
    if (profile == null) throw new Error("Missing candidate fixture");
    profile.packages.supported.push({
      name: "example",
      declaredVersion: "2.5.0",
      versionMatch: "in-range",
      activation: "opt-in",
      instrumentationOptions: [
        {
          id: "native",
          kind: "native",
          activation: "opt-in",
          versionMatch: "in-range",
        },
      ],
    });
    const finding = deriveFindings(detection).find(
      (item) => item.ruleId === "OTEL016",
    );
    expect(finding?.severity).toBe("info");
    expect(finding?.message).toContain(
      "ships native OpenTelemetry instrumentation",
    );
    expect(finding?.message).toContain("off by default");
    expect(finding?.fix).toContain("Enable example's native");
  });

  test("OTEL016 words external opt-in coverage without claiming native", () => {
    const detection = detectApplications(
      snapshot({
        "package.json": JSON.stringify({
          name: "app",
          engines: { node: "22" },
          scripts: { start: "node app.js" },
        }),
      }),
    );
    const profile = detection.candidates[0]?.compatibility;
    if (profile == null) throw new Error("Missing candidate fixture");
    profile.packages.supported.push({
      name: "example",
      declaredVersion: "2.5.0",
      versionMatch: "in-range",
      activation: "opt-in",
      instrumentationOptions: [
        {
          id: "external",
          kind: "external",
          activation: "opt-in",
          versionMatch: "in-range",
        },
      ],
    });
    const finding = deriveFindings(detection).find(
      (item) => item.ruleId === "OTEL016",
    );
    expect(finding?.message).toContain(
      "external OpenTelemetry instrumentation",
    );
    expect(finding?.message).not.toContain("native");
    expect(finding?.fix).toBe(
      "Enable the OpenTelemetry instrumentation for example",
    );
  });

  test("no OTEL016 when native instrumentation is automatic", () => {
    const detection = detectApplications(
      snapshot({
        "package.json": JSON.stringify({
          name: "app",
          engines: { node: "22" },
          scripts: { start: "node app.js" },
        }),
      }),
    );
    const profile = detection.candidates[0]?.compatibility;
    if (profile == null) throw new Error("Missing candidate fixture");
    profile.packages.supported.push({
      name: "example",
      declaredVersion: "2.5.0",
      versionMatch: "in-range",
      activation: "automatic",
    });
    expect(
      deriveFindings(detection).some((item) => item.ruleId === "OTEL016"),
    ).toBe(false);
  });

  test("OTEL021 for missing runtime metrics", () => {
    const rules = rulesFor({
      Gemfile: "gem 'rails', '~> 8.0'\n",
      ".ruby-version": "3.3.0\n",
    });
    expect(rules).toContain("OTEL021");
  });

  test("a clean project has no findings above info", () => {
    const detection = detectApplications(
      snapshot({
        "package.json": JSON.stringify({
          name: "clean",
          engines: { node: "22" },
          scripts: { start: "node index.js" },
          dependencies: { express: "4.18.2" },
        }),
      }),
    );
    const findings = deriveFindings({ candidates: detection.candidates });
    expect(hasFindingAtOrAbove(findings, "warning")).toBe(false);
    expect(hasFindingAtOrAbove(findings, "none")).toBe(false);
  });

  test("orders errors before warnings before info", () => {
    const detection = detectApplications(
      snapshot({
        "package.json": JSON.stringify({
          name: "app",
          engines: { node: "10" },
          scripts: { start: "node index.js" },
          dependencies: { express: "6.0.0", "dd-trace": "5" },
        }),
      }),
    );
    const severities = deriveFindings({
      candidates: detection.candidates,
    }).map((f) => f.severity);
    const order = { error: 2, warning: 1, info: 0 };
    for (let index = 1; index < severities.length; index++)
      expect(order[severities[index - 1]!]).toBeGreaterThanOrEqual(
        order[severities[index]!],
      );
  });
});
