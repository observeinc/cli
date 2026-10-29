import { parseManifest, type OtelSupportManifest } from "./schema";

/**
 * A small, self-contained support manifest for unit tests. Unlike
 * `loadManifest()`, its contents are fixed here, so editing the real bundled
 * `otel-support-manifest.yaml` (e.g. updating Ruby) never breaks scenario
 * tests. A fresh, validated instance is returned on every call, so callers may
 * mutate it freely.
 *
 * Runtimes and packages are chosen to satisfy the compatibility scenarios the
 * tests exercise:
 * - `nodejs` runtime versions: v22 → yes, v12 → no, `>=12` → partial.
 * - `express` `>=4.0.0 <5.0.0`: `^4.18.0` in-range, `6.0.0` out-of-range,
 *   `>=4 <7` overlap.
 * - `pg` cataloged so transitive `pg-types` / `postgres-array` roll up as
 *   covered internals.
 * - `dotnet` `net9.0` → yes; `java` `1.7` → no.
 * - `ruby` present with no packages, for tests that supply their own.
 */
export function fixtureManifest(): OtelSupportManifest {
  const sdkStability = {
    traces: "stable",
    metrics: "development",
    logs: "development",
    profiles: "none",
  } as const;
  return parseManifest({
    schemaVersion: 1,
    generatedAt: "2026-01-01T00:00:00Z",
    runtimes: {
      nodejs: {
        ecosystem: "npm",
        supportedRuntimeVersions: ">=14.0.0",
        autoInstrumentationSupported: true,
        runtimeMetricsSupported: true,
        sdkStability,
        packages: [
          {
            name: "express",
            instrumentation: "express-instrumentation",
            supportedVersions: ">=4.0.0 <5.0.0",
          },
          {
            name: "pg",
            instrumentation: "pg-instrumentation",
            supportedVersions: ">=1.1.0",
          },
        ],
      },
      dotnet: {
        ecosystem: "nuget",
        supportedRuntimeVersions: ">=6.0.0",
        autoInstrumentationSupported: true,
        runtimeMetricsSupported: true,
        sdkStability,
        packages: [],
      },
      java: {
        ecosystem: "maven",
        supportedRuntimeVersions: ">=8.0.0",
        autoInstrumentationSupported: true,
        runtimeMetricsSupported: true,
        sdkStability,
        packages: [],
      },
      ruby: {
        ecosystem: "gems",
        supportedRuntimeVersions: ">=3.0.0",
        autoInstrumentationSupported: true,
        runtimeMetricsSupported: false,
        sdkStability,
        packages: [],
      },
    },
  });
}
