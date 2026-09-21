import { describe, expect, test } from "bun:test";
import semver from "semver";
import { checkCompatibility } from "./check";
import { loadManifest, manifestInfo } from "./load";
import { parseManifest, type OtelSupportManifest } from "./schema";
import { fixtureManifest } from "./test-support";
import type { CandidateApplication, DetectedDependency } from "../types";

function candidate({
  language,
  version,
  dependencies = [],
}: {
  language: CandidateApplication["language"]["id"];
  version?: string;
  dependencies?: Partial<DetectedDependency>[];
}): CandidateApplication {
  return {
    id: `${language}:.`,
    path: ".",
    name: "app",
    language: { id: language, version },
    runtime: { id: language },
    frameworks: [],
    lockfiles: [],
    entrypoints: [],
    dependencies: dependencies.map((dependency) => ({
      ...dependency,
      name: dependency.name ?? "unknown",
      version: dependency.version,
      resolvedVersion: dependency.resolvedVersion,
      category: dependency.category ?? "other",
    })),
    testFrameworks: [],
    containerFiles: [],
    deploymentFiles: [],
    evidence: [],
    diagnostics: [],
  };
}

const manifest = fixtureManifest();

describe("checkCompatibility — auto-instrumentation runtimes", () => {
  test("transitive internals roll up under a cataloged parent", () => {
    const profile = checkCompatibility({
      candidate: candidate({
        language: "nodejs",
        dependencies: [
          { name: "pg", version: "8.13.0", category: "database" },
          {
            name: "pg-types",
            version: "2.2.0",
            category: "database",
            depth: 2,
            via: ["pg"],
          },
          {
            name: "postgres-array",
            version: "2.0.0",
            category: "database",
            depth: 3,
            via: ["pg", "pg-types"],
          },
        ],
      }),
      manifest,
    });
    const pg = profile.packages.supported.find((p) => p.name === "pg");
    expect(pg?.coveredInternals).toEqual(["pg-types", "postgres-array"]);
    expect(profile.packages.unverified).toHaveLength(0);
    expect(profile.packages.unsupported).toHaveLength(0);
  });

  test("a transitive dep with no cataloged ancestor is dropped, not flagged", () => {
    const profile = checkCompatibility({
      candidate: candidate({
        language: "nodejs",
        dependencies: [
          {
            name: "obscure-helper",
            version: "1.0.0",
            category: "orm",
            depth: 3,
            via: ["obscure-orm"],
          },
        ],
      }),
      manifest,
    });
    expect(profile.packages.unverified).toHaveLength(0);
    expect(profile.packages.supported).toHaveLength(0);
    expect(profile.packages.unsupported).toHaveLength(0);
  });

  test("supported package with an in-range version", () => {
    const profile = checkCompatibility({
      candidate: candidate({
        language: "nodejs",
        version: "22",
        dependencies: [
          { name: "express", version: "^4.18.0", category: "web-http" },
        ],
      }),
      manifest,
    });
    expect(profile.autoInstrumentationSupported).toBe(true);
    expect(profile.runtimeVersionSupported).toBe("yes");
    expect(profile.packages.supported.map((p) => p.name)).toContain("express");
    expect(profile.packages.unsupported).toHaveLength(0);
  });

  test("package with an out-of-range version is unsupported", () => {
    const profile = checkCompatibility({
      candidate: candidate({
        language: "nodejs",
        dependencies: [
          { name: "express", version: "6.0.0", category: "web-http" },
        ],
      }),
      manifest,
    });
    const express = profile.packages.unsupported.find(
      (p) => p.name === "express",
    );
    expect(express?.versionMatch).toBe("out-of-range");
    expect(express?.reason).toBe("out-of-range");
  });

  test("declared range wider than the supported range is an overlap", () => {
    const profile = checkCompatibility({
      candidate: candidate({
        language: "nodejs",
        dependencies: [
          { name: "express", version: ">=4 <7", category: "web-http" },
        ],
      }),
      manifest,
    });
    const express = profile.packages.supported.find(
      (p) => p.name === "express",
    );
    expect(express?.versionMatch).toBe("overlap");
  });

  test("lockfile-resolved version wins and is labelled as such", () => {
    const profile = checkCompatibility({
      candidate: candidate({
        language: "nodejs",
        dependencies: [
          {
            name: "express",
            version: "^4.18.0",
            resolvedVersion: "6.0.0",
            category: "web-http",
          },
        ],
      }),
      manifest,
    });
    const express = profile.packages.unsupported.find(
      (p) => p.name === "express",
    );
    expect(express?.declaredVersion).toBe("6.0.0");
    expect(express?.versionSource).toBe("lockfile");
  });

  test("unknown version lands in the unverified bucket, never unsupported", () => {
    const profile = checkCompatibility({
      candidate: candidate({
        language: "nodejs",
        dependencies: [
          { name: "express", version: "next", category: "web-http" },
        ],
      }),
      manifest,
    });
    const express = profile.packages.unverified.find(
      (p) => p.name === "express",
    );
    expect(express?.versionMatch).toBe("unknown");
    expect(profile.packages.supported).toHaveLength(0);
    expect(profile.packages.unsupported).toHaveLength(0);
  });

  test("a catalog miss is unverified, not proof of missing instrumentation", () => {
    const profile = checkCompatibility({
      candidate: candidate({
        language: "nodejs",
        dependencies: [
          { name: "obscure-orm", version: "1.0.0", category: "orm" },
        ],
      }),
      manifest,
    });
    const gap = profile.packages.unverified.find(
      (p) => p.name === "obscure-orm",
    );
    expect(gap?.unverifiedReason).toBe("catalog-missing");
    expect(profile.packages.unsupported).toHaveLength(0);
  });

  test.each([undefined, "*"])(
    "missing support and explicit wildcard differ: %s",
    (supportedVersions) => {
      const edited = structuredClone(manifest);
      const entry = edited.runtimes.nodejs;
      if (entry == null) throw new Error("Missing Node.js fixture");
      entry.packages = [
        {
          name: "express",
          instrumentation: "express-instrumentation",
          supportedVersions,
        },
      ];
      const profile = checkCompatibility({
        candidate: candidate({
          language: "nodejs",
          version: "22",
          dependencies: [{ name: "express", version: "4.18.2" }],
        }),
        manifest: edited,
      });
      if (supportedVersions == null) {
        expect(profile.packages.supported).toHaveLength(0);
        expect(profile.packages.unverified[0]?.unverifiedReason).toBe(
          "support-range-missing",
        );
        expect(
          profile.packages.unverified[0]?.instrumentationOptions?.[0]
            ?.instrumentation,
        ).toBe("express-instrumentation");
      } else {
        expect(profile.packages.supported[0]?.versionMatch).toBe("in-range");
      }
    },
  );

  test("unrelated utility libraries are not reported", () => {
    const profile = checkCompatibility({
      candidate: candidate({
        language: "nodejs",
        dependencies: [
          { name: "lodash", version: "4.17.0", category: "other" },
        ],
      }),
      manifest,
    });
    expect(profile.packages.supported).toHaveLength(0);
    expect(profile.packages.unsupported).toHaveLength(0);
  });

  test("out-of-range runtime version is reported", () => {
    const profile = checkCompatibility({
      candidate: candidate({ language: "nodejs", version: "12" }),
      manifest,
    });
    expect(profile.runtimeVersionSupported).toBe("no");
  });

  test("runtime version uses the runtime's own grammar", () => {
    expect(
      checkCompatibility({
        candidate: candidate({ language: "dotnet", version: "net9.0" }),
        manifest,
      }).runtimeVersionSupported,
    ).toBe("yes");
    expect(
      checkCompatibility({
        candidate: candidate({ language: "java", version: "1.7" }),
        manifest,
      }).runtimeVersionSupported,
    ).toBe("no");
    expect(
      checkCompatibility({
        candidate: candidate({ language: "nodejs", version: ">=12" }),
        manifest,
      }).runtimeVersionSupported,
    ).toBe("partial");
  });
});

describe("checkCompatibility — SDK-only and absent runtimes", () => {
  // A trimmed manifest with an SDK-only runtime (go) and an absent one.
  const smallManifest: OtelSupportManifest = parseManifest({
    schemaVersion: 1,
    generatedAt: "2026-01-01T00:00:00Z",
    runtimes: {
      go: {
        ecosystem: "gomod",
        autoInstrumentationSupported: false,
        runtimeMetricsSupported: false,
        sdkStability: {
          traces: "stable",
          metrics: "stable",
          logs: "beta",
          profiles: "none",
        },
        packages: [],
      },
    },
  });

  test("SDK-only runtime returns SDK stability with no package matrix", () => {
    const profile = checkCompatibility({
      candidate: candidate({ language: "go" }),
      manifest: smallManifest,
    });
    expect(profile.autoInstrumentationSupported).toBe(false);
    expect(profile.sdkStability?.logs).toBe("beta");
    expect(profile.packages.supported).toHaveLength(0);
  });

  test("absent runtime returns null SDK stability", () => {
    const profile = checkCompatibility({
      candidate: candidate({ language: "ruby" }),
      manifest: smallManifest,
    });
    expect(profile.autoInstrumentationSupported).toBe(false);
    expect(profile.sdkStability).toBeNull();
  });
});

describe("bundled manifest artifact", () => {
  test("covers all twelve runtimes with the expected auto-instrumentation split", () => {
    const bundled = loadManifest();
    const autoInstrumented = [
      "nodejs",
      "python",
      "java",
      "dotnet",
      "ruby",
      "php",
    ];
    const sdkOnly = ["go", "rust", "erlang", "cpp", "swift", "kotlin"];
    for (const runtime of autoInstrumented)
      expect(bundled.runtimes[runtime]?.autoInstrumentationSupported).toBe(
        true,
      );
    for (const runtime of sdkOnly) {
      expect(bundled.runtimes[runtime]?.autoInstrumentationSupported).toBe(
        false,
      );
      expect(bundled.runtimes[runtime]?.packages).toHaveLength(0);
    }
    expect(Object.keys(bundled.runtimes)).toHaveLength(12);
  });

  test("known ranges parse", () => {
    const bundled = loadManifest();
    for (const [runtime, entry] of Object.entries(bundled.runtimes))
      for (const pkg of entry.packages) {
        if (pkg.supportedVersions != null)
          expect(
            semver.validRange(pkg.supportedVersions),
            `${runtime}/${pkg.name}`,
          ).not.toBeNull();
        for (const option of pkg.instrumentationOptions ?? [])
          if (option.supportedVersions != null)
            expect(
              semver.validRange(option.supportedVersions),
              `${runtime}/${pkg.name}/${option.id}`,
            ).not.toBeNull();
      }
  });

  test.each([
    ["dalli", "4.1.0", "supported", "in-range", "automatic", "contrib"],
    ["dalli", "4.2.0", "supported", "in-range", "automatic", "native"],
    ["dalli", "4.1.1", "unsupported", "out-of-range", undefined, undefined],
    ["mongo", "2.22.0", "supported", "in-range", "automatic", "contrib"],
    ["mongo", "2.23.0", "supported", "in-range", "opt-in", "native"],
    ["mongo", "2.22.5", "unsupported", "out-of-range", undefined, undefined],
  ] as const)(
    "ruby %s %s is %s (%s, %s, %s)",
    (name, version, bucket, versionMatch, activation, coveringId) => {
      const bundled = loadManifest();
      const profile = checkCompatibility({
        candidate: candidate({
          language: "ruby",
          version: "3.3.0",
          dependencies: [{ name, version }],
        }),
        manifest: bundled,
      });
      const hit = profile.packages[bucket][0];
      expect(hit?.name).toBe(name);
      expect(hit?.versionMatch).toBe(versionMatch);
      expect(hit?.activation).toBe(activation);
      expect(
        hit?.instrumentationOptions?.find(
          (option) => option.versionMatch === "in-range",
        )?.id,
      ).toBe(coveringId);
    },
  );

  test("rejects unknown keys", () => {
    expect(() =>
      parseManifest({
        schemaVersion: 1,
        generatedAt: "2026-01-01T00:00:00Z",
        runtimes: {},
        extra: true,
      }),
    ).toThrow();
  });

  test("manifestInfo reports a stable sha256 for the bundled copy", () => {
    const info = manifestInfo();
    expect(info.origin).toBe("bundled");
    expect(info.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(manifestInfo().sha256).toBe(info.sha256);
  });
});
