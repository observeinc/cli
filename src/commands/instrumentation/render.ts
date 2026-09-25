import { formatTable, type ColumnDef } from "../../lib/formatters/table";
import {
  bold,
  cyan,
  green,
  muted,
  red,
  yellow,
} from "../../lib/formatters/colors";
import type {
  CandidateApplication,
  InstrumentationResult,
} from "../../lib/instrumentation/types";
import type { Finding } from "../../lib/instrumentation/findings";

type PackageAssessment = NonNullable<
  CandidateApplication["compatibility"]
>["packages"]["supported"][number];

function safeTerminalText(value: string) {
  let safe = "";
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    const character = value[index];
    if ((code === 9 || code >= 32) && character != null) safe += character;
  }
  return safe;
}

function stabilityColor(level: string) {
  if (level === "stable") return green(level);
  if (
    level === "release_candidate" ||
    level === "beta" ||
    level === "development"
  )
    return yellow(level);
  return muted(level);
}

function libraryStatus(
  pkg: PackageAssessment,
  autoInstrumentationSupported: boolean,
) {
  if (pkg.aggregator)
    return pkg.components && pkg.components.length > 0
      ? green("✓ covered via components")
      : muted("• aggregator (no components)");
  if (pkg.versionMatch === "out-of-range") return red("✗ out of range");
  // On a code-based-auto-instrumentation-only runtime the whole app is wired in
  // by hand (stated in the header), so don't repeat it per row. On a zero-code
  // runtime a manual/opt-in library is the exception, so call it out.
  const action = !autoInstrumentationSupported
    ? ""
    : pkg.activation === "opt-in"
      ? " · enable required"
      : pkg.activation === "manual"
        ? " · manual wiring"
        : "";
  if (pkg.versionMatch === "overlap")
    return yellow(`⚠ partially in range${action}`);
  if (pkg.versionMatch === "unknown") {
    // A cataloged library whose instrumentation package is known but whose
    // supported range is not published (e.g. all of Go contrib) is available to
    // wire in, not an unverified coverage gap.
    if (!autoInstrumentationSupported) return green("✓ available");
    return muted(`• unverified${action}`);
  }
  return action === "" ? green("✓ supported") : yellow(`✓ supported${action}`);
}

/** A pure aggregator that resolves to no instrumented components (BOM, validation). */
function isNeutralAggregator(pkg: PackageAssessment) {
  return (
    pkg.aggregator === true && !(pkg.components && pkg.components.length > 0)
  );
}

function isCovered(pkg: PackageAssessment) {
  if (pkg.aggregator) return (pkg.components?.length ?? 0) > 0;
  return pkg.reason == null && pkg.versionMatch === "in-range";
}

function keyValue(label: string, value: string) {
  return `  ${muted(label.padEnd(24))}${value}`;
}

function renderCompatibility(candidate: CandidateApplication) {
  const compat = candidate.compatibility;
  if (compat == null) return [];
  const lines: string[] = [];

  lines.push(runtimeModelLine(compat));
  lines.push("");

  const status = runtimeStatusLabel(
    compat,
    candidate.language.version != null,
  );
  const version = candidate.language.version
    ? ` ${candidate.language.version}`
    : "";
  lines.push(
    keyValue(
      "Runtime",
      `${candidate.language.id}${version} ${muted("(")}${status}${muted(")")}`,
    ),
  );

  if (compat.sdkStability != null) {
    const s = compat.sdkStability;
    const signal = (name: keyof typeof s) =>
      `${muted(name)} ${stabilityColor(s[name])}`;
    lines.push(
      keyValue(
        "SDK stability",
        `${signal("traces")}  ${signal("metrics")}  ${signal("logs")}  ${signal("profiles")}`,
      ),
    );
  }
  lines.push(
    keyValue(
      "Runtime metrics",
      compat.runtimeMetricsSupported ? green("available") : red("unavailable"),
    ),
  );
  if (
    compat.autoInstrumentationSupported ||
    Object.values(compat.packages).some((packages) => packages.length > 0)
  ) {
    const rows = [
      ...compat.packages.supported,
      ...compat.packages.unsupported,
      ...compat.packages.unverified,
    ].sort((a, b) => a.name.localeCompare(b.name));
    lines.push("");
    if (rows.length === 0) {
      lines.push(muted("Libraries: none instrumentable detected"));
    } else {
      // Pure aggregators with no instrumented components (BOMs, validation)
      // are neither supported nor a gap; exclude them from the tally.
      const rated = rows.filter((pkg) => !isNeutralAggregator(pkg));
      const neutralCount = rows.length - rated.length;
      const supportedCount = rated.filter(isCovered).length;
      const unverifiedCount = compat.packages.unverified.length;
      const partialCount = rated.filter(
        (pkg) => pkg.versionMatch === "overlap",
      ).length;
      const aggregatorSuffix =
        neutralCount > 0 ? ` · ${neutralCount} aggregator` : "";
      const partialSuffix =
        partialCount > 0 ? ` · ${partialCount} partial` : "";
      lines.push(
        bold("Libraries") +
          muted(
            compat.autoInstrumentationSupported
              ? `  ${supportedCount}/${rated.length} supported` +
                  partialSuffix +
                  (unverifiedCount > 0
                    ? ` · ${unverifiedCount} unverified`
                    : "") +
                  aggregatorSuffix
              : `  ${rated.length} with instrumentation available` +
                  partialSuffix +
                  aggregatorSuffix,
          ),
      );
      const columns: ColumnDef<PackageAssessment>[] = [
        {
          header: "LIBRARY",
          accessorFn: (row) => row.name,
          flex: true,
          maxWidth: 34,
          format: (value) => cyan(String(value)),
        },
        {
          header: "DETECTED",
          accessorFn: (row) =>
            row.declaredVersion == null
              ? "—"
              : row.versionSource === "lockfile"
                ? `${row.declaredVersion} (lock)`
                : row.declaredVersion,
        },
        {
          header: "SUPPORTED",
          accessorFn: (row) => row.supportedVersions ?? "—",
          maxWidth: 22,
        },
        {
          header: "ORIGIN",
          accessorFn: (row) =>
            row.depth == null || row.depth <= 1
              ? "direct"
              : `via ${row.via?.join(" → ") ?? "transitive"}`,
          maxWidth: 28,
          format: (value) => muted(String(value)),
        },
        {
          header: "STATUS",
          accessorFn: (row) => row.versionMatch,
          format: (_value, row) =>
            libraryStatus(row, compat.autoInstrumentationSupported),
        },
        {
          header: "INSTRUMENTATION",
          accessorFn: (row) => {
            if (row.aggregator)
              return row.components && row.components.length > 0
                ? `via ${row.components.join(", ")}`
                : "—";
            const instrumentation =
              row.instrumentationOptions
                ?.map((option) => option.instrumentation ?? "unknown")
                .join(", ") ?? "—";
            const internals =
              row.coveredInternals && row.coveredInternals.length > 0
                ? ` (+${String(row.coveredInternals.length)} internal)`
                : "";
            return `${instrumentation}${internals}`;
          },
          flex: true,
          maxWidth: 46,
          format: (value) => muted(String(value)),
        },
      ];
      lines.push(formatTable(rows, columns).trimEnd());
    }
  }
  return lines;
}

function candidateHeading(candidate: CandidateApplication) {
  const version = candidate.language.version
    ? ` ${candidate.language.version}`
    : "";
  const manager = candidate.packageManager
    ? ` · ${candidate.packageManager.id}`
    : "";
  return `${bold(safeTerminalText(candidate.name))}  ${muted(`· ${candidate.language.id}${version}${manager}${discoverySummary(candidate)}  (${safeTerminalText(candidate.id)})`)}`;
}

function discoverySummary(candidate: CandidateApplication) {
  const discovery = candidate.discovery;
  return discovery == null
    ? ""
    : ` · discovery ${discovery.completeness} (${discovery.provenance.provider})`;
}

function severityMark(severity: Finding["severity"]) {
  return severity === "error"
    ? red("✗")
    : severity === "warning"
      ? yellow("⚠")
      : muted("•");
}

type Compatibility = NonNullable<CandidateApplication["compatibility"]>;

/** The ● model line: how (and whether) OpenTelemetry instruments this runtime. */
function runtimeModelLine(compat: Compatibility) {
  return compat.autoInstrumentationSupported
    ? green("● zero-code instrumentation available")
    : compat.sdkStability == null
      ? red("● runtime not supported by OpenTelemetry")
      : yellow("● code-based auto-instrumentation only");
}

/** Runtime-version support label, e.g. "supported" / "unsupported". */
function runtimeStatusLabel(compat: Compatibility, hasVersion: boolean) {
  return !hasVersion
    ? muted("version unknown")
    : compat.runtimeVersionSupported === "yes"
      ? green("supported")
      : compat.runtimeVersionSupported === "no"
        ? red("unsupported")
        : compat.runtimeVersionSupported === "partial"
          ? yellow("partially supported")
          : muted("version support unknown");
}

/** Per-signal SDK stability as a single inline string (empty when unknown). */
function sdkStabilityInline(compat: Compatibility) {
  const s = compat.sdkStability;
  if (s == null) return "";
  const signal = (name: keyof typeof s) =>
    `${muted(name)} ${stabilityColor(s[name])}`;
  return `${signal("traces")} · ${signal("metrics")} · ${signal("logs")} · ${signal("profiles")}`;
}

/** Cataloged libraries as a compact cell: a few names, then "+N more". */
function librarySummaryText(compat: Compatibility) {
  const rated = [
    ...compat.packages.supported,
    ...compat.packages.unsupported,
    ...compat.packages.unverified,
  ].filter((pkg) => !isNeutralAggregator(pkg));
  if (rated.length === 0) return "none detected";
  const names = rated.map((pkg) => pkg.name).sort((a, b) => a.localeCompare(b));
  return names.length <= 3
    ? names.join(", ")
    : `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
}

/** Distinct rule IDs affecting a candidate, each at its worst severity. */
function findingRules(candidateId: string, byCandidate: Map<string, Finding[]>) {
  const rank: Record<Finding["severity"], number> = {
    error: 0,
    warning: 1,
    info: 2,
  };
  const worst = new Map<string, Finding["severity"]>();
  for (const finding of byCandidate.get(candidateId) ?? []) {
    const prev = worst.get(finding.ruleId);
    if (prev == null || rank[finding.severity] < rank[prev])
      worst.set(finding.ruleId, finding.severity);
  }
  return [...worst.entries()];
}

/** "3 go · 2 nodejs", runtimes in first-seen order. */
function runtimeCounts(candidates: CandidateApplication[]) {
  const counts = new Map<string, number>();
  for (const candidate of candidates)
    counts.set(
      candidate.language.id,
      (counts.get(candidate.language.id) ?? 0) + 1,
    );
  return [...counts.entries()].map(([lang, n]) => `${n} ${lang}`).join(" · ");
}

/** Group candidates by runtime + version; runtime facts are shared within a group. */
function groupByRuntime(candidates: CandidateApplication[]) {
  const groups = new Map<string, CandidateApplication[]>();
  for (const candidate of candidates) {
    const key = `${candidate.language.id} ${candidate.language.version ?? ""}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(candidate);
    else groups.set(key, [candidate]);
  }
  return [...groups.values()];
}

/**
 * One runtime's shared facts printed once, then a compact row per application.
 * Used when more than one application is detected; a single app (or `--app`)
 * still gets the full per-app block via `renderCompatibility`.
 */
function renderRuntimeGroup(
  group: CandidateApplication[],
  byCandidate: Map<string, Finding[]>,
) {
  const lines: string[] = [];
  const [first] = group;
  if (first == null) return lines;
  const version = first.language.version ? ` ${first.language.version}` : "";
  const compat = first.compatibility;
  if (compat == null) {
    lines.push(
      `${bold(safeTerminalText(first.language.id) + version)}  ${muted("· runtime not assessed by OpenTelemetry")}`,
    );
  } else {
    lines.push(
      `${bold(first.language.id + version)}  ${muted("(")}${runtimeStatusLabel(compat, first.language.version != null)}${muted(")")}  ${runtimeModelLine(compat)}`,
    );
    const sdk = sdkStabilityInline(compat);
    const metrics = compat.runtimeMetricsSupported
      ? green("available")
      : red("unavailable");
    lines.push(
      `  ${muted("SDK")} ${sdk}${sdk === "" ? "" : " · "}${muted("runtime metrics")} ${metrics}`,
    );
  }
  const columns: ColumnDef<CandidateApplication>[] = [
    {
      // The full candidate id, verbatim, so it can be copied straight into
      // `--app <id>` (the same id the findings footer and headings show).
      header: "APPLICATION",
      accessorFn: (row) => safeTerminalText(row.id),
      maxWidth: 40,
      format: (value) => cyan(String(value)),
    },
    {
      header: "LIBRARIES",
      accessorFn: (row) =>
        row.compatibility ? librarySummaryText(row.compatibility) : "—",
      maxWidth: 50,
      format: (value) =>
        value === "none detected" || value === "—"
          ? muted(String(value))
          : String(value),
    },
    {
      header: "FINDINGS",
      accessorFn: (row) => {
        const rules = findingRules(row.id, byCandidate);
        return rules.length === 0
          ? "✓"
          : rules.map(([ruleId]) => ruleId).join(" · ");
      },
      format: (_value, row) => {
        const rules = findingRules(row.id, byCandidate);
        return rules.length === 0
          ? green("✓")
          : rules
              .map(
                ([ruleId, severity]) =>
                  `${severityMark(severity)} ${cyan(ruleId)}`,
              )
              .join(" · ");
      },
    },
  ];
  lines.push(formatTable(group, columns).trimEnd());
  for (const candidate of group)
    for (const diagnostic of candidate.diagnostics)
      lines.push(
        `  ${muted(safeTerminalText(candidate.id))}  ${severityMark(diagnostic.severity)} ${muted(diagnostic.code)}  ${safeTerminalText(diagnostic.message)}`,
      );
  return lines;
}

/**
 * Human output for `audit`: every candidate's compatibility block followed by
 * the findings list, the way `npm audit` prints advisories.
 */
export function renderAudit({
  result,
  candidates,
  findings,
}: {
  result: InstrumentationResult;
  candidates: CandidateApplication[];
  findings: Finding[];
}) {
  const lines = [
    `${bold("OpenTelemetry instrumentation audit")}  ${muted(safeTerminalText(result.root))}`,
    muted(
      `manifest ${result.manifest.generatedAt.slice(0, 10)} · ${result.manifest.sha256.slice(0, 12)} · ${result.manifest.origin}`,
    ),
  ];

  if (candidates.length === 0) {
    lines.push("", muted("No supported application detected."));
  } else if (candidates.length === 1) {
    // A single app (or a `--app <id>` selection) gets the full detail block.
    for (const candidate of candidates) {
      lines.push(
        "",
        candidateHeading(candidate),
        ...renderCompatibility(candidate),
      );
      for (const diagnostic of candidate.diagnostics)
        lines.push(
          `  ${muted(diagnostic.code)}  ${safeTerminalText(diagnostic.message)}`,
        );
    }
  } else {
    // Multiple apps: an orientation summary, then compact rows grouped by
    // runtime so shared facts (model, SDK stability) are not repeated per app.
    const counts = { error: 0, warning: 0, info: 0 };
    for (const finding of findings) counts[finding.severity]++;
    lines.push(
      "",
      `${bold(`${candidates.length} applications`)}${muted(`  · ${runtimeCounts(candidates)} · ${findings.length} finding${findings.length === 1 ? "" : "s"} (${counts.error} error · ${counts.warning} warning · ${counts.info} info)`)}`,
    );
    const byCandidate = new Map<string, Finding[]>();
    for (const finding of findings) {
      const bucket = byCandidate.get(finding.candidateId);
      if (bucket) bucket.push(finding);
      else byCandidate.set(finding.candidateId, [finding]);
    }
    for (const group of groupByRuntime(candidates))
      lines.push("", ...renderRuntimeGroup(group, byCandidate));
    lines.push(
      "",
      muted(
        `Inspect one app: observe instrumentation audit ${safeTerminalText(result.root)} --app <APPLICATION>` +
          ` (a value from the APPLICATION column, e.g. ${safeTerminalText(candidates[0]?.id ?? "<id>")})`,
      ),
    );
  }

  lines.push("");
  if (findings.length === 0) {
    const analysisFailed =
      candidates.length === 0 ||
      result.diagnostics.some((diagnostic) => diagnostic.severity === "error");
    lines.push(
      analysisFailed
        ? red("Analysis incomplete; no clean verdict")
        : green("✓ No findings"),
    );
  } else {
    const counts = { error: 0, warning: 0, info: 0 };
    for (const finding of findings) counts[finding.severity]++;
    lines.push(
      bold(`${findings.length} finding${findings.length === 1 ? "" : "s"}`) +
        muted(
          `  ${counts.error} error · ${counts.warning} warning · ${counts.info} info`,
        ),
    );
    // Collapse findings identical except for the app they apply to (e.g. the
    // same OTEL004 across every Go app) into one entry listing those apps.
    const groups = new Map<string, Finding[]>();
    for (const finding of findings) {
      const key = `${finding.ruleId}\u0000${finding.message}\u0000${finding.fix}`;
      const bucket = groups.get(key);
      if (bucket) bucket.push(finding);
      else groups.set(key, [finding]);
    }
    for (const group of groups.values()) {
      const [finding] = group;
      if (finding == null) continue;
      const where =
        group.length === 1 && candidates.length > 1
          ? muted(` [${safeTerminalText(finding.candidateId)}]`)
          : "";
      lines.push(
        `  ${severityMark(finding.severity)} ${cyan(finding.ruleId)}  ${safeTerminalText(finding.message)}${where}`,
      );
      if (group.length > 1) {
        const ids = group.map((item) => safeTerminalText(item.candidateId));
        const shown =
          ids.length > 8 ? [...ids.slice(0, 8), `+${ids.length - 8} more`] : ids;
        lines.push(`      ${muted(`${group.length} apps · ${shown.join(", ")}`)}`);
      }
      lines.push(`      ${muted(safeTerminalText(finding.fix))}`);
    }
  }
  if (result.diagnostics.length > 0) {
    lines.push("", bold("Diagnostics"));
    for (const diagnostic of result.diagnostics)
      lines.push(
        `  ${severityMark(diagnostic.severity)} ${muted(diagnostic.code)}  ${diagnostic.message}`,
      );
  }
  return lines.join("\n");
}
