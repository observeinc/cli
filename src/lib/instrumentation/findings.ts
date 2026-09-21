import type {
  CandidateApplication,
  DiagnosticSeverity,
  InstrumentationResult,
} from "./types";
import type { PackageAssessment } from "./manifest/profile";

/**
 * Stable rule identifiers. Scripts and baselines key on these, so an ID is
 * never reused or renumbered once shipped. Severity is policy and may change.
 */
export const RULES = {
  OTEL001: {
    severity: "error",
    title: "Runtime is not supported by OpenTelemetry",
  },
  OTEL002: {
    severity: "error",
    title: "Runtime version is below the supported range",
  },
  OTEL003: {
    severity: "warning",
    title: "Runtime version cannot be confirmed as supported",
  },
  OTEL010: {
    severity: "warning",
    title: "Library version is outside the instrumented range",
  },
  OTEL012: {
    severity: "warning",
    title: "Declared version range is only partly instrumented",
  },
  OTEL013: {
    severity: "info",
    title: "Library version could not be compared",
  },
  // OTEL014 (library absent from the support catalog) is retired: the audit
  // assesses only libraries the manifest catalogs and stays silent on unknowns.
  // Never reuse the ID.
  OTEL015: {
    severity: "info",
    title: "Instrumentation support range is unknown",
  },
  OTEL016: {
    severity: "info",
    title: "Native instrumentation is disabled by default",
  },
  OTEL021: {
    severity: "info",
    title: "Runtime metrics are unavailable for this runtime",
  },
} as const satisfies Record<
  string,
  { severity: DiagnosticSeverity; title: string }
>;

export type RuleId = keyof typeof RULES;

export interface Finding {
  ruleId: RuleId;
  severity: DiagnosticSeverity;
  candidateId: string;
  /** Library the finding is about; absent for runtime-level findings. */
  package?: string;
  version?: string;
  scope?: string;
  message: string;
  /** What the reader can do about it. */
  fix: string;
  /** File the finding is attributed to, relative to the scan root. */
  path: string;
}

export const SEVERITY_ORDER: Record<DiagnosticSeverity, number> = {
  info: 0,
  warning: 1,
  error: 2,
};

/** Stable key for baseline suppression. */
export function findingKey(finding: Finding) {
  return JSON.stringify([
    finding.ruleId,
    finding.candidateId,
    finding.package ?? "",
    finding.version ?? "",
    finding.scope ?? "",
  ]);
}

function finding({
  ruleId,
  candidate,
  message,
  fix,
  pkg,
}: {
  ruleId: RuleId;
  candidate: CandidateApplication;
  message: string;
  fix: string;
  pkg?: PackageAssessment;
}): Finding {
  const dependency =
    pkg == null
      ? undefined
      : candidate.dependencies.find(
          (item) => item.name === pkg.name && item.scope === pkg.scope,
        );
  const provenance =
    dependency?.depth != null && dependency.depth > 1
      ? ` via ${dependency.via?.join(" -> ") ?? "a transitive dependency"}`
      : "";
  return {
    ruleId,
    severity: RULES[ruleId].severity,
    candidateId: candidate.id,
    ...(pkg == null
      ? { version: candidate.language.version }
      : { package: pkg.name, version: pkg.declaredVersion, scope: pkg.scope }),
    message: `${message}${provenance}`,
    fix,
    path:
      candidate.evidence.find((item) => item.kind === "manifest")?.path ??
      candidate.evidence[0]?.path ??
      candidate.path,
  };
}

/**
 * Derive rule-based findings from a detection result. Findings restate the
 * facts already in each candidate's compatibility profile as actionable
 * items; the profile stays the source of truth.
 */
export function deriveFindings(
  result: Pick<InstrumentationResult, "candidates">,
): Finding[] {
  const findings: Finding[] = [];
  for (const candidate of result.candidates)
    findings.push(...candidateFindings(candidate));
  return findings.sort(
    (a, b) =>
      SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity] ||
      a.candidateId.localeCompare(b.candidateId) ||
      a.ruleId.localeCompare(b.ruleId) ||
      (a.package ?? "").localeCompare(b.package ?? ""),
  );
}

function candidateFindings(candidate: CandidateApplication): Finding[] {
  const compat = candidate.compatibility;
  if (compat == null) return [];
  const out: Finding[] = [];
  const runtime = candidate.language.id;
  const version = candidate.language.version;

  if (!compat.autoInstrumentationSupported && compat.sdkStability == null) {
    out.push(
      finding({
        ruleId: "OTEL001",
        candidate,
        message: `OpenTelemetry has no SDK for ${runtime}`,
        fix: "Choose a different application or an alternative instrumentation technology",
      }),
    );
    return out;
  }

  if (compat.runtimeVersionSupported === "no")
    out.push(
      finding({
        ruleId: "OTEL002",
        candidate,
        message:
          `${runtime} ${version ?? ""} is below the version range auto-instrumentation supports`.trim(),
        fix: `Upgrade the ${runtime} runtime`,
      }),
    );
  else if (
    compat.autoInstrumentationSupported &&
    (compat.runtimeVersionSupported === "unknown" ||
      compat.runtimeVersionSupported === "partial")
  )
    out.push(
      finding({
        ruleId: "OTEL003",
        candidate,
        message:
          version == null
            ? `No ${runtime} runtime version is declared`
            : `${runtime} ${version} admits versions outside the supported range`,
        fix:
          version == null
            ? "Declare the runtime version (engines, .nvmrc, .ruby-version, .python-version, .tool-versions, TargetFramework, or a Dockerfile FROM tag)"
            : "Pin the runtime to a version inside the supported range",
      }),
    );

  for (const pkg of compat.packages.unsupported) {
    if (
      pkg.versionSource === "runtime" &&
      compat.runtimeVersionSupported === "no"
    )
      continue;
    out.push(
      finding({
        ruleId: "OTEL010",
        candidate,
        pkg,
        message:
          `${pkg.name} ${pkg.declaredVersion ?? ""} is outside the instrumented range ${pkg.supportedVersions ?? ""}`.trim(),
        fix: `Move ${pkg.name} to a version in ${pkg.supportedVersions ?? "the supported range"}`,
      }),
    );
  }

  for (const pkg of compat.packages.supported) {
    if (pkg.versionMatch === "overlap" && pkg.versionSource !== "runtime")
      out.push(
        finding({
          ruleId: "OTEL012",
          candidate,
          pkg,
          message:
            `${pkg.name} ${pkg.declaredVersion ?? ""} can resolve to versions outside ${pkg.supportedVersions ?? "the instrumented range"}`.trim(),
          fix: `Narrow the ${pkg.name} range or commit a lockfile so the resolved version can be checked`,
        }),
      );
    if (pkg.activation === "opt-in") {
      // Word the finding from the covering option's kind, not from activation
      // alone: only a `native` path is the library shipping its own
      // instrumentation. Opt-in is only set when real instrumentationOptions
      // exist, so a covering option (and its kind) is always present here.
      const native = (pkg.instrumentationOptions ?? []).some(
        (option) =>
          option.activation === "opt-in" &&
          (option.versionMatch === "in-range" ||
            option.versionMatch === "overlap") &&
          option.kind === "native",
      );
      out.push(
        finding({
          ruleId: "OTEL016",
          candidate,
          pkg,
          message: native
            ? `${pkg.name} ships native OpenTelemetry instrumentation that is off by default; no telemetry is produced until it is enabled`
            : `${pkg.name} is covered by external OpenTelemetry instrumentation that is off by default; no telemetry is produced until it is enabled`,
          fix: native
            ? `Enable ${pkg.name}'s native OpenTelemetry instrumentation`
            : `Enable the OpenTelemetry instrumentation for ${pkg.name}`,
        }),
      );
    }
  }

  for (const pkg of compat.packages.unverified) {
    if (pkg.unverifiedReason === "support-range-missing") {
      out.push(
        finding({
          ruleId: "OTEL015",
          candidate,
          pkg,
          message: `Instrumentation exists for ${pkg.name}, but some supported library versions are unknown; coverage cannot be confirmed`,
          fix: "Check the instrumentation's upstream support documentation and source; request a catalog update when evidence is available",
        }),
      );
      continue;
    }
    out.push(
      finding({
        ruleId: "OTEL013",
        candidate,
        pkg,
        message:
          pkg.declaredVersion == null
            ? `${pkg.name} has no declared version`
            : `${pkg.name} version "${pkg.declaredVersion}" could not be parsed`,
        fix: "Commit a lockfile or pin the version so it can be compared",
      }),
    );
  }

  if (compat.autoInstrumentationSupported && !compat.runtimeMetricsSupported)
    out.push(
      finding({
        ruleId: "OTEL021",
        candidate,
        message: `Runtime metrics are not available for ${runtime}`,
        fix: "Remove runtime metrics from the success criteria for this application",
      }),
    );

  return out;
}

/** Whether any finding is at or above the threshold. */
export function hasFindingAtOrAbove(
  findings: Finding[],
  threshold: DiagnosticSeverity | "none",
) {
  if (threshold === "none") return false;
  const floor = SEVERITY_ORDER[threshold];
  return findings.some((f) => SEVERITY_ORDER[f.severity] >= floor);
}
