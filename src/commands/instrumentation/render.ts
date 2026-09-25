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

  lines.push(
    compat.autoInstrumentationSupported
      ? green("● zero-code instrumentation available")
      : compat.sdkStability == null
        ? red("● runtime not supported by OpenTelemetry")
        : yellow("● code-based auto-instrumentation only"),
  );
  lines.push("");

  const status =
    candidate.language.version == null
      ? muted("version unknown")
      : compat.runtimeVersionSupported === "yes"
        ? green("supported")
        : compat.runtimeVersionSupported === "no"
          ? red("unsupported")
          : compat.runtimeVersionSupported === "partial"
            ? yellow("partially supported")
            : muted("version support unknown");
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
  }
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
    for (const finding of findings) {
      const where =
        candidates.length > 1
          ? muted(` [${safeTerminalText(finding.candidateId)}]`)
          : "";
      lines.push(
        `  ${severityMark(finding.severity)} ${cyan(finding.ruleId)}  ${safeTerminalText(finding.message)}${where}`,
        `      ${muted(safeTerminalText(finding.fix))}`,
      );
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
