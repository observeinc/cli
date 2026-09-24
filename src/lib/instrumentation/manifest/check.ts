import type { CandidateApplication, DetectedDependency } from "../types";
import {
  matchVersion,
  normalizeRuntimeVersion,
  type VersionMatch,
} from "./version-grammar";
import type { OtelSupportManifest, PackageEntry, RuntimeEntry } from "./schema";
import type {
  CompatibilityProfile,
  InstrumentationOptionAssessment,
  PackageAssessment,
  RuntimeVersionSupport,
} from "./profile";

export type {
  CompatibilityProfile,
  PackageAssessment,
  RuntimeVersionSupport,
  UnsupportedReason,
} from "./profile";

/**
 * Dependency aggregators (Spring Boot starters, Spring Cloud starters, BOMs).
 * These are not instrumented libraries — the agent instruments the concrete
 * libraries they pull in transitively (e.g. spring-boot-starter-data-jpa brings
 * hibernate-core + jdbc). They must not be reported as coverage gaps.
 */
const AGGREGATOR_PATTERNS = [
  /^spring-boot-starter(-.*)?$/i,
  /^spring-cloud-starter(-.*)?$/i,
  /^spring-boot-dependencies$/i,
  /-bom$/i,
];

function isAggregator(name: string) {
  return AGGREGATOR_PATTERNS.some((pattern) => pattern.test(name.trim()));
}

/**
 * Known Spring Boot starters mapped to the concrete instrumented libraries they
 * pull in transitively. The agent instruments these libraries, not the starter
 * artifact — so a declared starter is "covered via" whichever of these are in
 * the manifest. Components not in the manifest are simply dropped.
 */
const STARTER_COMPONENTS: Record<string, string[]> = {
  "spring-boot-starter-web": [
    "spring-webmvc",
    "spring-web",
    "tomcat-embed-core",
  ],
  "spring-boot-starter-webflux": [
    "spring-webflux",
    "spring-web",
    "reactor-netty",
  ],
  "spring-boot-starter-data-jpa": [
    "hibernate-core",
    "spring-data-commons",
    "jdbc",
  ],
  "spring-boot-starter-jdbc": ["jdbc"],
  "spring-boot-starter-data-r2dbc": ["r2dbc"],
  "spring-boot-starter-security": ["spring-security-config"],
  "spring-boot-starter-data-mongodb": ["mongo"],
  "spring-boot-starter-amqp": ["spring-rabbit"],
  "spring-boot-starter-batch": ["spring-batch-core"],
  "spring-boot-starter-quartz": ["quartz"],
};

interface PackageIndex {
  ecosystem: RuntimeEntry["ecosystem"];
  byName: Map<string, PackageEntry>;
}

/**
 * Package names as the ecosystem compares them. PyPI names are
 * case-insensitive and treat runs of `-`, `_`, and `.` as equal (PEP 503), so
 * `confluent_kafka` and `Confluent-Kafka` are one distribution.
 */
function nameKey(ecosystem: RuntimeEntry["ecosystem"], name: string) {
  const lower = name.trim().toLowerCase();
  return ecosystem === "pypi" ? lower.replace(/[-_.]+/g, "-") : lower;
}

/** Index cataloged packages by name and by every declared alias. */
function indexPackages(entry: RuntimeEntry): PackageIndex {
  const byName = new Map<string, PackageEntry>();
  for (const pkg of entry.packages)
    for (const name of [pkg.name, ...(pkg.aliases ?? [])]) {
      const key = nameKey(entry.ecosystem, name);
      if (!byName.has(key)) byName.set(key, pkg);
    }
  return { ecosystem: entry.ecosystem, byName };
}

function findPackage(index: PackageIndex, name: string) {
  return index.byName.get(nameKey(index.ecosystem, name));
}

/**
 * The nearest ancestor of a transitive dependency that is itself in the catalog,
 * walking each dependency path from the dependency outward. Returns the ancestor
 * name as it appears in the graph (so it matches the assessed package's name),
 * or undefined when no ancestor is cataloged.
 */
function nearestCatalogedAncestor(
  dependency: DetectedDependency,
  index: PackageIndex,
): string | undefined {
  const chains =
    dependency.paths != null && dependency.paths.length > 0
      ? dependency.paths
      : dependency.via != null
        ? [dependency.via]
        : [];
  for (const chain of chains)
    for (let position = chain.length - 1; position >= 0; position--) {
      const ancestor = chain[position];
      if (ancestor != null && findPackage(index, ancestor) != null)
        return ancestor;
    }
  return undefined;
}

const EMPTY_PACKAGES = () => ({
  supported: [] as PackageAssessment[],
  unsupported: [] as PackageAssessment[],
  unverified: [] as PackageAssessment[],
});

/** An instrumentation option normalized for assessment; the scalar/legacy
 * fallback fits this shape without an authored activation. */
type OptionForAssessment = Omit<
  InstrumentationOptionAssessment,
  "versionMatch"
>;

function assessOptions({
  pkg,
  ecosystem,
  declared,
}: {
  pkg: PackageEntry;
  ecosystem: RuntimeEntry["ecosystem"];
  declared: string | undefined;
}) {
  // The scalar/legacy fallback exists only to unify version matching; it carries
  // no activation (scalar packages have no activation concept), so it is typed
  // loosely rather than as an authored `InstrumentationOption`.
  const hasRealOptions = pkg.instrumentationOptions != null;
  const options: OptionForAssessment[] = pkg.instrumentationOptions ?? [
    {
      id: "legacy",
      instrumentation: pkg.instrumentation,
      kind: "unknown",
      supportedVersions: pkg.supportedVersions,
      inAutoInstrumentation: pkg.inAutoInstrumentation,
    },
  ];
  const assessments: InstrumentationOptionAssessment[] = options.map(
    (option) => ({
      ...option,
      versionMatch: matchVersion({
        ecosystem,
        declared,
        range: option.supportedVersions,
      }),
    }),
  );
  const ranges = options.flatMap((option) =>
    option.supportedVersions == null ? [] : [option.supportedVersions],
  );
  const supportedVersions =
    ranges.length === 0 ? undefined : ranges.join(" || ");
  const combined = matchVersion({
    ecosystem,
    declared,
    range: supportedVersions,
  });
  const versionMatch =
    combined !== "in-range" &&
    assessments.some((option) => option.versionMatch === "unknown")
      ? ("unknown" as const)
      : combined;
  // Activation is a fact about the covering options — those whose version range
  // could apply to the scanned version. An automatic covering path means
  // telemetry flows with no action; otherwise the covered support is opt-in.
  const covering = assessments.filter(
    (option) =>
      option.versionMatch === "in-range" || option.versionMatch === "overlap",
  );
  const activation = !hasRealOptions
    ? undefined
    : covering.some((option) => option.activation === "automatic")
      ? ("automatic" as const)
      : covering.some((option) => option.activation === "opt-in")
        ? ("opt-in" as const)
        : undefined;
  return {
    assessments,
    supportedVersions,
    versionMatch,
    activation,
    missingRange: options.some((option) => option.supportedVersions == null),
  };
}

/**
 * Evaluate a detected application against the OpenTelemetry support manifest and
 * return its compatibility profile: whether auto-instrumentation exists, whether
 * the runtime version is supported, per-signal SDK maturity, and the detected
 * libraries partitioned into supported / unsupported / unverified.
 *
 * When the runtime is absent from the manifest (no SDK exists), the profile is
 * `autoInstrumentationSupported: false`, `sdkStability: null`. A runtime with an
 * SDK but no auto-instrumentation returns populated `sdkStability` and assesses
 * any explicitly cataloged libraries independently.
 */
export function checkCompatibility({
  candidate,
  manifest,
}: {
  candidate: CandidateApplication;
  manifest: OtelSupportManifest;
}): CompatibilityProfile {
  const runtime = candidate.language.id;
  const entry: RuntimeEntry | undefined = manifest.runtimes[runtime];

  if (entry == null) {
    return {
      runtime,
      autoInstrumentationSupported: false,
      runtimeVersionSupported: "unknown",
      runtimeMetricsSupported: false,
      sdkStability: null,
      packages: EMPTY_PACKAGES(),
    };
  }

  const runtimeVersionSupported = assessRuntimeVersion(candidate, entry);

  const index = indexPackages(entry);
  const key = (name: string) => nameKey(entry.ecosystem, name);
  const packages = EMPTY_PACKAGES();
  // Internal sub-packages to attribute to a cataloged ancestor after the pass,
  // keyed by the normalized ancestor name.
  const rollups = new Map<string, Set<string>>();

  for (const dependency of candidate.dependencies) {
    if (
      dependency.scope != null &&
      !["runtime", "peer", "optional", "unknown"].includes(dependency.scope)
    )
      continue;
    const runtimeReference =
      dependency.sourceKind === "framework-reference" &&
      dependency.resolvedVersion == null &&
      dependency.version == null;
    const declaredVersion =
      dependency.resolvedVersion ??
      dependency.version ??
      (runtimeReference ? candidate.language.version : undefined);
    const versionSource = runtimeReference
      ? ("runtime" as const)
      : dependency.resolvedVersion != null
        ? ("lockfile" as const)
        : declaredVersion != null
          ? ("manifest" as const)
          : undefined;

    // Aggregators (Spring Boot starters, BOMs) are covered via the concrete
    // libraries they pull in, not by name — never treat them as a gap. Resolve
    // known starters to the instrumented components present in the manifest.
    if (isAggregator(dependency.name)) {
      const components = (STARTER_COMPONENTS[key(dependency.name)] ?? [])
        .filter((component) => findPackage(index, component) != null)
        .sort();
      packages.supported.push({
        name: dependency.name,
        declaredVersion,
        versionSource,
        versionMatch: "unknown",
        aggregator: true,
        components,
      });
      continue;
    }

    const pkg = findPackage(index, dependency.name);

    if (pkg == null) {
      // The catalog is the authority on what can be assessed; an uncataloged
      // library is left unassessed rather than guessed at by name. The one
      // exception is a transitive dependency of a cataloged library: attribute
      // it to that ancestor as a covered internal instead of dropping it.
      const isDirect = dependency.depth == null || dependency.depth <= 1;
      if (!isDirect) {
        const ancestor = nearestCatalogedAncestor(dependency, index);
        if (ancestor != null) {
          let internals = rollups.get(key(ancestor));
          if (internals == null) {
            internals = new Set();
            rollups.set(key(ancestor), internals);
          }
          internals.add(dependency.name);
        }
      }
      continue;
    }

    const options = assessOptions({
      pkg,
      ecosystem: entry.ecosystem,
      declared: declaredVersion,
    });
    const versionMatch =
      pkg.instrumentationOptions == null &&
      pkg.supportedVersions != null &&
      runtimeReference
        ? frameworkReferenceMatch(runtimeVersionSupported)
        : options.versionMatch;
    const assessment: PackageAssessment = {
      name: dependency.name,
      scope: dependency.scope,
      declaredVersion,
      versionSource,
      supportedVersions: options.supportedVersions,
      versionMatch,
      ...(versionMatch === "unknown"
        ? {
            unverifiedReason: options.missingRange
              ? ("support-range-missing" as const)
              : ("application-version-unknown" as const),
          }
        : {}),
      instrumentationOptions: options.assessments,
      activation: options.activation,
      depth: dependency.depth,
      via: dependency.via,
      paths: dependency.paths,
    };
    // Out-of-range is a proven incompatibility. An overlap is supported for
    // some admitted versions and is reported as a warning by the rule layer.
    // An unparseable version is a missing input, not a verdict either way.
    if (versionMatch === "out-of-range")
      packages.unsupported.push({ ...assessment, reason: "out-of-range" });
    else if (versionMatch === "unknown") packages.unverified.push(assessment);
    else packages.supported.push(assessment);
  }

  // Attribute rolled-up internals to their cataloged ancestor's assessment.
  for (const assessment of [
    ...packages.supported,
    ...packages.unsupported,
    ...packages.unverified,
  ]) {
    const internals = rollups.get(key(assessment.name));
    if (internals != null && internals.size > 0)
      assessment.coveredInternals = [...internals].sort();
  }

  for (const bucket of Object.values(packages))
    bucket.sort((a, b) => a.name.localeCompare(b.name));

  return {
    runtime,
    autoInstrumentationSupported: entry.autoInstrumentationSupported,
    runtimeVersionSupported,
    runtimeMetricsSupported: entry.runtimeMetricsSupported,
    sdkStability: entry.sdkStability,
    packages,
  };
}

/**
 * A framework reference (e.g. .NET's implicit `Microsoft.AspNetCore.App`) ships
 * with the runtime, so its version is the runtime version. Reuse the runtime
 * verdict instead of reporting it as unverified.
 */
function frameworkReferenceMatch(
  runtimeVersionSupported: RuntimeVersionSupport,
): VersionMatch {
  switch (runtimeVersionSupported) {
    case "yes":
      return "in-range";
    case "no":
      return "out-of-range";
    case "partial":
      return "overlap";
    case "unknown":
      return "unknown";
  }
}

function assessRuntimeVersion(
  candidate: CandidateApplication,
  entry: RuntimeEntry,
): RuntimeVersionSupport {
  const declared = candidate.language.version;
  if (declared == null || entry.supportedRuntimeVersions == null)
    return "unknown";
  const normalized = normalizeRuntimeVersion(candidate.language.id, declared);
  if (normalized == null) return "unknown";
  const match = matchVersion({
    // .NET multi-targeting (<TargetFrameworks>net6.0;net8.0</TargetFrameworks>)
    // normalizes to a semver union like "6.0.0 || 8.0.0". The nuget declared
    // grammar only parses single versions and bracket intervals, so it returns
    // "unknown" for a union; npm's is the one comparator dialect that parses
    // `||` natively, so borrow it to evaluate the union. Single-target .NET is
    // an exact version, handled before this switch, so only the multi-target
    // case takes the npm branch.
    ecosystem:
      candidate.language.id === "dotnet" && normalized.includes(" || ")
        ? "npm"
        : entry.ecosystem,
    declared: normalized,
    range: entry.supportedRuntimeVersions,
  });
  switch (match) {
    case "in-range":
      return "yes";
    case "out-of-range":
      return "no";
    case "overlap":
      return "partial";
    case "unknown":
      return "unknown";
  }
}
