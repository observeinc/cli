import { describe, expect, test } from "bun:test";
import semver from "semver";
import { checkCompatibility } from "./check";
import { loadManifest, manifestInfo } from "./load";
import { parseManifest, type OtelSupportManifest } from "./schema";
import { fixtureManifest } from "./test-support";
import type { CandidateApplication, DetectedDependency } from "../types";
import type { VersionMatch } from "./version-grammar";

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
    })),
    testFrameworks: [],
    containerFiles: [],
    deploymentFiles: [],
    evidence: [],
    diagnostics: [],
  };
}

const manifest = fixtureManifest();

describe("checkCompatibility — package names", () => {
  const supportedNames = (
    language: CandidateApplication["language"]["id"],
    names: string[],
  ) =>
    checkCompatibility({
      candidate: candidate({
        language,
        dependencies: names.map((name) => ({
          name,
          version: "2.9.9",
          scope: "runtime",
        })),
      }),
      manifest: loadManifest(),
    }).packages.supported.map((pkg) => pkg.name);

  test("a catalog alias matches an alternate distribution name", () => {
    expect(supportedNames("python", ["psycopg2-binary"])).toEqual([
      "psycopg2-binary",
    ]);
  });

  test("PyPI names match regardless of case, '_', '.', or '-'", () => {
    expect(supportedNames("python", ["Kafka_Python", "PSYCOPG2"])).toEqual([
      "Kafka_Python",
      "PSYCOPG2",
    ]);
  });

  test("npm names are not PEP 503 normalized", () => {
    expect(supportedNames("nodejs", ["io_redis"])).toEqual([]);
  });
});

describe("checkCompatibility — auto-instrumentation runtimes", () => {
  test("transitive internals roll up under a cataloged parent", () => {
    const profile = checkCompatibility({
      candidate: candidate({
        language: "nodejs",
        dependencies: [
          { name: "pg", version: "8.13.0" },
          {
            name: "pg-types",
            version: "2.2.0",
            depth: 2,
            via: ["pg"],
          },
          {
            name: "postgres-array",
            version: "2.0.0",
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
        dependencies: [{ name: "express", version: "^4.18.0" }],
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
        dependencies: [{ name: "express", version: "6.0.0" }],
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
        dependencies: [{ name: "express", version: ">=4 <7" }],
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
        dependencies: [{ name: "express", version: "next" }],
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

  test("an uncataloged library is left unassessed, not flagged", () => {
    const profile = checkCompatibility({
      candidate: candidate({
        language: "nodejs",
        dependencies: [{ name: "obscure-orm", version: "1.0.0" }],
      }),
      manifest,
    });
    expect(profile.packages.supported).toHaveLength(0);
    expect(profile.packages.unsupported).toHaveLength(0);
    expect(profile.packages.unverified).toHaveLength(0);
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
        dependencies: [{ name: "lodash", version: "4.17.0" }],
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

describe("checkCompatibility — Go manual instrumentation (bundled catalog)", () => {
  const go = (dependencies: Partial<DetectedDependency>[]) =>
    checkCompatibility({
      candidate: candidate({ language: "go", version: "1.25", dependencies }),
      manifest: loadManifest(),
    });

  test("runtime metrics are supported on the SDK-only Go runtime", () => {
    expect(go([])).toMatchObject({
      autoInstrumentationSupported: false,
      runtimeMetricsSupported: true,
    });
  });

  test("contrib libraries are manual with an unknown range, never supported", () => {
    const packages = go([
      {
        name: "github.com/gin-gonic/gin",
        version: "v1.10.0",
        scope: "runtime",
      },
    ]).packages;
    expect(packages.supported).toHaveLength(0);
    expect(packages.unverified[0]).toMatchObject({
      name: "github.com/gin-gonic/gin",
      activation: "manual",
      unverifiedReason: "support-range-missing",
    });
  });

  test("gRPC's native plugin covers 1.64.0+; older versions stay unverified", () => {
    const grpc = (version: string) =>
      go([{ name: "google.golang.org/grpc", version, scope: "runtime" }])
        .packages;
    expect(grpc("v1.70.0").supported[0]).toMatchObject({
      versionMatch: "in-range",
      activation: "manual",
    });
    // otelgrpc has no published range, so an older gRPC is not provably
    // unsupported.
    expect(grpc("v1.60.0").unverified[0]?.activation).toBe("manual");
  });

  test.each<[string, string, VersionMatch]>([
    ["github.com/elastic/go-elasticsearch/v8", "v8.11.0", "out-of-range"],
    ["github.com/elastic/go-elasticsearch/v8", "v8.12.0", "in-range"],
    ["github.com/elastic/go-elasticsearch/v9", "v9.0.0", "in-range"],
  ])("native OpenTelemetry in %s %s is %s", (name, version, match) => {
    const { packages } = go([{ name, version, scope: "runtime" }]);
    const assessed = [...packages.supported, ...packages.unsupported][0];
    expect(assessed?.versionMatch).toBe(match);
    expect(assessed?.instrumentationOptions?.[0]?.activation).toBe("manual");
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
  test("php auto-instrumentation runtime floor is SDK ^8.1", () => {
    const bundled = loadManifest();
    expect(
      checkCompatibility({
        candidate: candidate({ language: "php", version: "8.1.0" }),
        manifest: bundled,
      }).runtimeVersionSupported,
    ).toBe("yes");
    expect(
      checkCompatibility({
        candidate: candidate({ language: "php", version: "8.0.0" }),
        manifest: bundled,
      }).runtimeVersionSupported,
    ).toBe("no");
  });

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
      const entry = bundled.runtimes[runtime];
      expect(entry?.autoInstrumentationSupported).toBe(false);
      // An SDK-only runtime may catalog instrumentation libraries (Go), but
      // none may read as auto-injected: every option is manual wiring.
      for (const pkg of entry?.packages ?? []) {
        expect(pkg.instrumentationOptions).toBeDefined();
        for (const option of pkg.instrumentationOptions ?? []) {
          expect(option.activation).toBe("manual");
          expect(option.inAutoInstrumentation).not.toBe(true);
        }
      }
    }
    expect(bundled.runtimes.go?.packages.length).toBeGreaterThan(0);
    for (const runtime of sdkOnly.filter((runtime) => runtime !== "go"))
      expect(bundled.runtimes[runtime]?.packages).toHaveLength(0);
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

  test.each([
    ["Grpc.Net.Client", "2.52.0", "supported", "in-range"],
    ["Grpc.Net.Client", "2.51.0", "unsupported", "out-of-range"],
    ["Grpc.Net.Client", "3.0.0", "unsupported", "out-of-range"],
    ["StackExchange.Redis", "2.6.122", "supported", "in-range"],
    ["StackExchange.Redis", "2.6.0", "unsupported", "out-of-range"],
    ["StackExchange.Redis", "4.0.0", "unsupported", "out-of-range"],
    ["Microsoft.Data.Sqlite", "8.0.0", "supported", "in-range"],
    ["Microsoft.Data.Sqlite", "7.0.0", "unsupported", "out-of-range"],
    ["Microsoft.Data.Sqlite", "12.0.0", "unsupported", "out-of-range"],
    ["NServiceBus", "9.0.0", "supported", "in-range"],
    ["NServiceBus", "10.0.0", "unsupported", "out-of-range"],
    ["NLog", "5.0.0", "supported", "in-range"],
    ["NLog", "7.0.0", "unsupported", "out-of-range"],
    ["Confluent.Kafka", "1.4.0", "supported", "in-range"],
    ["Confluent.Kafka", "3.0.0", "unsupported", "out-of-range"],
  ] as const)("dotnet %s %s is %s (%s)", (name, version, bucket, match) => {
    const bundled = loadManifest();
    const profile = checkCompatibility({
      candidate: candidate({
        language: "dotnet",
        version: "net9.0",
        dependencies: [{ name, version }],
      }),
      manifest: bundled,
    });
    const hit = profile.packages[bucket][0];
    expect(hit?.name).toBe(name);
    expect(hit?.versionMatch).toBe(match);
  });

  test.each([
    [
      "Elastic.Clients.Elasticsearch",
      "8.5.0",
      "supported",
      "in-range",
      "automatic",
      "elasticsearch",
    ],
    [
      "Elastic.Clients.Elasticsearch",
      "8.12.0",
      "supported",
      "in-range",
      "automatic",
      "elastic-transport",
    ],
    [
      "Elastic.Clients.Elasticsearch",
      "7.17.0",
      "unsupported",
      "out-of-range",
      undefined,
      undefined,
    ],
    [
      "MongoDB.Driver",
      "2.7.0",
      "supported",
      "in-range",
      "automatic",
      "contrib",
    ],
    ["MongoDB.Driver", "3.7.0", "supported", "in-range", "automatic", "native"],
    [
      "MongoDB.Driver",
      "2.6.0",
      "unsupported",
      "out-of-range",
      undefined,
      undefined,
    ],
  ] as const)(
    "dotnet %s %s is %s (%s, %s, %s)",
    (name, version, bucket, versionMatch, activation, coveringId) => {
      const bundled = loadManifest();
      const profile = checkCompatibility({
        candidate: candidate({
          language: "dotnet",
          version: "net9.0",
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

  test.each([
    // Laravel is the union of Composer `^6`…`^13`, so 14 is out of range.
    ["laravel/framework", "6.0.0", "supported", "in-range"],
    ["laravel/framework", "13.0.0", "supported", "in-range"],
    ["laravel/framework", "5.8.0", "unsupported", "out-of-range"],
    ["laravel/framework", "14.0.0", "unsupported", "out-of-range"],
    // Slim is Composer `^4`, not an open floor.
    ["slim/slim", "4.12.0", "supported", "in-range"],
    ["slim/slim", "3.12.0", "unsupported", "out-of-range"],
    ["slim/slim", "5.0.0", "unsupported", "out-of-range"],
    // doctrine/dbal is `^3 || ^4 || ^5`.
    ["doctrine/dbal", "2.13.0", "unsupported", "out-of-range"],
    ["doctrine/dbal", "3.0.0", "supported", "in-range"],
    ["doctrine/dbal", "5.0.0", "supported", "in-range"],
    ["doctrine/dbal", "6.0.0", "unsupported", "out-of-range"],
    // mongodb/mongodb is `^1.15 || ^2.0`.
    ["mongodb/mongodb", "1.14.0", "unsupported", "out-of-range"],
    ["mongodb/mongodb", "1.15.0", "supported", "in-range"],
    ["mongodb/mongodb", "2.0.0", "supported", "in-range"],
    ["mongodb/mongodb", "3.0.0", "unsupported", "out-of-range"],
    // magento/framework is Composer `^103.0`.
    ["magento/framework", "103.0.0", "supported", "in-range"],
    ["magento/framework", "102.0.0", "unsupported", "out-of-range"],
    ["magento/framework", "104.0.0", "unsupported", "out-of-range"],
    // Upstream require is `*` — omit the range rather than inventing one.
    ["openai-php/client", "0.10.0", "unverified", "unknown"],
    ["symfony/http-kernel", "7.2.0", "unverified", "unknown"],
  ] as const)("php %s %s is %s (%s)", (name, version, bucket, match) => {
    const bundled = loadManifest();
    const profile = checkCompatibility({
      candidate: candidate({
        language: "php",
        version: "8.3.0",
        dependencies: [{ name, version }],
      }),
      manifest: bundled,
    });
    const hit = profile.packages[bucket][0];
    expect(hit?.name).toBe(name);
    expect(hit?.versionMatch).toBe(match);
    if (bucket === "unverified")
      expect(hit?.unverifiedReason).toBe("support-range-missing");
  });

  test.each([
    // FastAPI's PEP 440 `~= 0.92` translates to `>=0.92.0 <1.0.0`, not an open
    // floor — 1.x is out of range.
    ["fastapi", "0.92.0", "supported", "in-range"],
    ["fastapi", "0.91.0", "unsupported", "out-of-range"],
    ["fastapi", "1.0.0", "unsupported", "out-of-range"],
    // `requests ~= 2.0` translates to `>=2.0.0 <3.0.0`, so a hypothetical 3.x
    // is out of range rather than an unbounded floor.
    ["requests", "2.32.0", "supported", "in-range"],
    ["requests", "3.0.0", "unsupported", "out-of-range"],
    // SQLAlchemy carries an explicit upper bound of `< 2.1.0`.
    ["sqlalchemy", "2.0.30", "supported", "in-range"],
    ["sqlalchemy", "2.1.0", "unsupported", "out-of-range"],
    // PyMySQL is upper-bound only (`< 2`).
    ["pymysql", "1.1.1", "supported", "in-range"],
    ["pymysql", "2.0.0", "unsupported", "out-of-range"],
    // grpcio's floor moved up to 1.42.0.
    ["grpcio", "1.42.0", "supported", "in-range"],
    ["grpcio", "1.40.0", "unsupported", "out-of-range"],
    // Django's floor moved up to 2.0.
    ["django", "4.2.0", "supported", "in-range"],
    ["django", "1.11.0", "unsupported", "out-of-range"],
  ] as const)("python %s %s is %s (%s)", (name, version, bucket, match) => {
    const bundled = loadManifest();
    const profile = checkCompatibility({
      candidate: candidate({
        language: "python",
        version: "3.12.0",
        dependencies: [{ name, version }],
      }),
      manifest: bundled,
    });
    const hit = profile.packages[bucket][0];
    expect(hit?.name).toBe(name);
    expect(hit?.versionMatch).toBe(match);
  });

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
