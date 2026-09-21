import type { VersionMatch } from "./version-grammar";
import type { InstrumentationOption, SdkStability } from "./schema";

/**
 * Compatibility types produced by the static check. Kept free of any import
 * from `../types` so the shared `CandidateApplication` can reference the profile
 * without a module cycle.
 */

export type RuntimeVersionSupport = "yes" | "no" | "partial" | "unknown";

/** Why a package landed in the `unsupported` bucket. */
export type UnsupportedReason = "out-of-range";

export interface InstrumentationOptionAssessment {
  id: string;
  instrumentation?: string;
  kind: InstrumentationOption["kind"] | "unknown";
  supportedVersions?: string;
  inAutoInstrumentation?: boolean;
  activation?: InstrumentationOption["activation"];
  versionMatch: VersionMatch;
}

export interface PackageAssessment {
  /** The scanned library name. */
  name: string;
  declaredVersion?: string;
  /** Where `declaredVersion` came from: an exact lockfile pin or a manifest range. */
  versionSource?: "lockfile" | "manifest" | "runtime";
  scope?: string;
  depth?: number;
  via?: string[];
  paths?: string[][];
  supportedVersions?: string;
  versionMatch: VersionMatch;
  unverifiedReason?: "support-range-missing" | "application-version-unknown";
  /** Present only for `unsupported` entries. */
  reason?: UnsupportedReason;
  instrumentationOptions?: InstrumentationOptionAssessment[];
  /**
   * Whether the covering instrumentation is on by default. Set only for
   * `supported` packages that carry explicit `instrumentationOptions`; absent
   * for scalar/legacy packages, which have no activation concept.
   */
  activation?: "automatic" | "opt-in";
  /**
   * Set when the dependency is a dependency aggregator (a Spring Boot starter,
   * a BOM, etc.) rather than an instrumented library. Coverage comes from the
   * concrete libraries it pulls in, so it is not counted as a gap.
   */
  aggregator?: boolean;
  /**
   * For an aggregator: the instrumented component libraries it resolves to that
   * are present in the manifest (e.g. spring-boot-starter-data-jpa →
   * hibernate-core, spring-data-commons, jdbc). Empty when the aggregator has no
   * instrumented components.
   */
  components?: string[];
  /**
   * Internal sub-packages this cataloged library's instrumentation already
   * covers (e.g. pg → pg-types, pg-int8, postgres-array). These arrive only as
   * transitive dependencies of this library, so they are attributed here rather
   * than reported as independent coverage gaps. Sorted and de-duplicated.
   */
  coveredInternals?: string[];
}

export interface CompatibilityProfile {
  /** The `telemetry.sdk.language` key evaluated against, or the raw id. */
  runtime: string;
  /**
   * Whether a manifest-detectable auto-instrumentation path exists. When false
   * with a populated `sdkStability`, the runtime has an SDK but no
   * auto-instrumentation (manual effort). When false with `sdkStability: null`,
   * the runtime is not supported by OpenTelemetry at all.
   */
  autoInstrumentationSupported: boolean;
  runtimeVersionSupported: RuntimeVersionSupport;
  runtimeMetricsSupported: boolean;
  /** Per-signal SDK maturity; null when the runtime is absent from the manifest. */
  sdkStability: SdkStability | null;
  packages: {
    /** Instrumentation exists; versionMatch distinguishes full and partial support. */
    supported: PackageAssessment[];
    /** Proven version incompatibility. */
    unsupported: PackageAssessment[];
    /** Catalog, upstream range, or application-version evidence is missing. */
    unverified: PackageAssessment[];
  };
}
