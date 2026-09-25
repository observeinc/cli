import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { defineCommand } from "../../lib/stricli-wrappers";
import type { LocalContext } from "../../context";
import { muteStatusWriter } from "../../lib/writer";
import { createProjectSnapshot } from "../../lib/instrumentation/snapshot";
import { detectApplications } from "../../lib/instrumentation/detect";
import {
  manifestInfo,
  setManifestOverride,
} from "../../lib/instrumentation/manifest/load";
import { parseManifest } from "../../lib/instrumentation/manifest/schema";
import {
  INSTRUMENTATION_SCHEMA_VERSION,
  type CandidateApplication,
  type InstrumentationResult,
  type LanguageId,
} from "../../lib/instrumentation/types";
import {
  deriveFindings,
  hasFindingAtOrAbove,
  type Finding,
} from "../../lib/instrumentation/findings";
import { toSarif } from "../../lib/instrumentation/formats/sarif";
import { toGithubAnnotations } from "../../lib/instrumentation/formats/github";
import { loadCycloneDx } from "../../lib/instrumentation/graph/providers/cyclonedx";
import type { DependencyGraph } from "../../lib/instrumentation/graph/types";
import { applyGraph } from "../../lib/instrumentation/graph/apply";
import { checkCompatibility } from "../../lib/instrumentation/manifest/check";
import { loadManifest } from "../../lib/instrumentation/manifest/load";
import { buildNpmArboristGraph } from "../../lib/instrumentation/graph/providers/npm-arborist";
import { resolveNative } from "../../lib/instrumentation/graph/native-providers";
import { renderAudit } from "./render";

const FORMATS = ["table", "json", "sarif", "github"] as const;
const FAIL_ON = ["none", "info", "warning", "error"] as const;

type AuditFormat = (typeof FORMATS)[number];
type FailOn = (typeof FAIL_ON)[number];

interface AuditFlags {
  format?: AuditFormat;
  "fail-on"?: FailOn;
  app?: string;
  manifest?: string;
  sbom?: string;
  resolve?: boolean;
  exclude?: readonly string[];
}

export interface AuditDeps {
  createSnapshot?: typeof createProjectSnapshot;
  buildNpmGraph?: typeof buildNpmArboristGraph;
  resolveNativeGraph?: typeof resolveNative;
}

/**
 * Exit codes: 0 clean, 1 findings at or above --fail-on, 2 tool error. A tool
 * error is anything that prevents a trustworthy verdict for the project as a
 * whole: an unreadable path or manifest, an incomplete scan, or no detected
 * application. A problem confined to one application is reported as a finding
 * (OTEL030) so the rest of the project is still assessed.
 */
export const AUDIT_EXIT = { clean: 0, findings: 1, error: 2 } as const;

/** JSON shape emitted by `--format json`. */
export interface AuditReport extends InstrumentationResult {
  findings: Finding[];
  failOn: FailOn;
  failed: boolean;
}

function loadManifestFile(path: string) {
  const text = readFileSync(path, "utf8");
  const raw: unknown = path.endsWith(".json")
    ? JSON.parse(text)
    : parseYaml(text);
  return parseManifest(raw);
}

/** CycloneDX purl types → the runtime the SBOM describes. */
const PURL_TYPE_TO_LANGUAGE: Record<string, LanguageId> = {
  npm: "nodejs",
  pypi: "python",
  nuget: "dotnet",
  golang: "go",
  cargo: "rust",
  gem: "ruby",
  composer: "php",
  maven: "java",
};

/** The runtime an SBOM describes, from the most common component purl type. */
function sbomLanguage(graph: DependencyGraph): LanguageId | undefined {
  const counts = new Map<LanguageId, number>();
  for (const node of graph.nodes.values()) {
    const type = /^pkg:([^/]+)\//.exec(node.purl ?? "")?.[1]?.toLowerCase();
    const language = type == null ? undefined : PURL_TYPE_TO_LANGUAGE[type];
    if (language != null) counts.set(language, (counts.get(language) ?? 0) + 1);
  }
  let best: LanguageId | undefined;
  let bestCount = 0;
  for (const [language, count] of counts)
    if (count > bestCount) {
      best = language;
      bestCount = count;
    }
  return best;
}

/**
 * Build a candidate from a CycloneDX SBOM alone, for when no single application
 * was detected on disk to attach it to. The runtime comes from the components'
 * package URLs and the graph from the SBOM itself, so an SBOM for an app that is
 * not checked out locally can still be audited.
 */
function synthesizeSbomCandidate(
  graph: DependencyGraph,
  sbomPath: string,
): CandidateApplication {
  const language = sbomLanguage(graph);
  if (language == null)
    throw new Error(
      "Could not determine the runtime from the SBOM's package URLs. Add a " +
        "component purl (e.g. pkg:npm/…), or bind the SBOM to a detected " +
        "application with --app <id>.",
    );
  const rootId = graph.roots[0];
  const rootName = rootId == null ? undefined : graph.nodes.get(rootId)?.name;
  const name =
    rootName != null && rootName !== "SBOM inventory"
      ? rootName
      : "sbom-application";
  return {
    id: `sbom:${name}`,
    path: sbomPath,
    name,
    language: { id: language },
    runtime: { id: language },
    frameworks: [],
    lockfiles: [],
    entrypoints: [],
    dependencies: [],
    testFrameworks: [],
    containerFiles: [],
    deploymentFiles: [],
    evidence: [],
    diagnostics: [],
  };
}

export async function audit(
  this: LocalContext,
  flags: AuditFlags,
  targetPath?: string,
  deps: AuditDeps = {},
): Promise<void> {
  const { process, writer: baseWriter } = this;
  const format = flags.format ?? "table";
  const failOn = flags["fail-on"] ?? "error";
  const writer = muteStatusWriter(baseWriter, { muted: format !== "table" });
  const createSnapshot = deps.createSnapshot ?? createProjectSnapshot;
  const buildNpmGraph = deps.buildNpmGraph ?? buildNpmArboristGraph;
  const resolveNativeGraph = deps.resolveNativeGraph ?? resolveNative;
  const root = resolve(process.cwd(), targetPath ?? ".");

  try {
    if (flags.manifest)
      setManifestOverride(
        loadManifestFile(resolve(process.cwd(), flags.manifest)),
      );

    let result: InstrumentationResult;
    let findings: Finding[];
    let analysisFailed: boolean;

    if (flags.sbom != null && flags.app == null) {
      // --sbom audits the SBOM file itself, independent of any project on disk:
      // no filesystem scan, runtime inferred from the component purls. Use --app
      // to instead bind the SBOM to a detected application's graph.
      const sbomPath = resolve(process.cwd(), flags.sbom);
      const graph = loadCycloneDx(sbomPath);
      const candidate = synthesizeSbomCandidate(graph, sbomPath);
      applyGraph({ candidate, graph });
      candidate.compatibility = checkCompatibility({
        candidate,
        manifest: loadManifest(),
      });
      result = {
        schemaVersion: INSTRUMENTATION_SCHEMA_VERSION,
        root: sbomPath,
        status: "ready",
        manifest: manifestInfo(),
        candidates: [candidate],
        diagnostics: [],
        selection: null,
      };
      findings = deriveFindings(result);
      analysisFailed = false;
    } else {
      const snapshot = createSnapshot({
        targetPath: root,
        exclude: flags.exclude ?? [],
      });
      const incomplete = snapshot.diagnostics.find((diagnostic) =>
        [
          "SCAN_LIMIT_REACHED",
          "METADATA_UNREADABLE",
          "METADATA_TOO_LARGE",
        ].includes(diagnostic.code),
      );
      if (incomplete != null)
        throw new Error(`Incomplete scan: ${incomplete.message}`);
      const detection = detectApplications(snapshot);
      const candidates = flags.app
        ? detection.candidates.filter(
            (candidate) => candidate.id === flags.app,
          )
        : detection.candidates;
      if (flags.app && candidates.length === 0) {
        const available = detection.candidates
          .map((candidate) => candidate.id)
          .sort((a, b) => a.localeCompare(b));
        // Name the scanned directory: a common cause is running --app without
        // the same project path, so the id belongs to a different project.
        throw new Error(
          `No application with id "${flags.app}" in ${root}. ` +
            (available.length === 0
              ? "No applications were detected there."
              : `Pass the same project path, and use one of: ${available.join(", ")}`),
        );
      }
      // With --app, an SBOM is the dependency graph for that one application.
      const [selected] = candidates;
      const sbomCandidate = flags.sbom != null ? (selected ?? null) : null;
      for (const candidate of candidates) {
        let graph =
          candidate === sbomCandidate && flags.sbom != null
            ? loadCycloneDx(resolve(process.cwd(), flags.sbom))
            : candidate.dependencyGraph == null
              ? await buildNpmGraph({ candidate, snapshot })
              : null;
        if (graph == null && flags.resolve) {
          const resolution = resolveNativeGraph({ candidate, snapshot });
          graph = resolution?.graph ?? null;
          if (resolution?.diagnostic != null)
            candidate.diagnostics.push(resolution.diagnostic);
        }
        if (graph != null) {
          applyGraph({ candidate, graph });
          candidate.compatibility = checkCompatibility({
            candidate,
            manifest: loadManifest(),
          });
        }
      }
      // MULTIPLE_CANDIDATES is irrelevant here: audit evaluates every candidate.
      const diagnostics = detection.diagnostics.filter(
        (diagnostic) => diagnostic.code !== "MULTIPLE_CANDIDATES",
      );
      result = {
        schemaVersion: INSTRUMENTATION_SCHEMA_VERSION,
        root: snapshot.root,
        status: candidates.length === 0 ? "unsupported" : "ready",
        manifest: manifestInfo(),
        candidates,
        diagnostics,
        selection: flags.app ?? null,
      };
      findings = deriveFindings(result);
      analysisFailed =
        candidates.length === 0 ||
        diagnostics.some((diagnostic) => diagnostic.severity === "error");
    }

    const failed = analysisFailed || hasFindingAtOrAbove(findings, failOn);

    switch (format) {
      case "json": {
        const report: AuditReport = {
          ...result,
          findings,
          failOn,
          failed,
        };
        writer.write(JSON.stringify(report, null, 2));
        break;
      }
      case "sarif":
        writer.write(
          JSON.stringify(
            toSarif({
              findings,
              root: result.root,
              manifestSha256: result.manifest.sha256,
            }),
            null,
            2,
          ),
        );
        break;
      case "github":
        writer.write(toGithubAnnotations(findings));
        break;
      case "table":
        writer.write(
          renderAudit({ result, candidates: result.candidates, findings }),
        );
        break;
    }
    process.exitCode = analysisFailed
      ? AUDIT_EXIT.error
      : failed
        ? AUDIT_EXIT.findings
        : AUDIT_EXIT.clean;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (format === "table") writer.error(`Error: ${message}`);
    else process.stderr.write(`${JSON.stringify({ error: { message } })}\n`);
    process.exitCode = AUDIT_EXIT.error;
  } finally {
    if (flags.manifest) setManifestOverride(null);
  }
}

export const auditCommand = defineCommand({
  experimental: true,
  experimentalExitCode: AUDIT_EXIT.error,
  loader: async () => audit,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        {
          placeholder: "path",
          brief: "Project directory",
          parse: String,
          optional: true,
        },
      ],
    },
    flags: {
      format: {
        kind: "enum",
        values: FORMATS,
        brief: "Output format (table, json, sarif, github)",
        optional: true,
      },
      "fail-on": {
        kind: "enum",
        values: FAIL_ON,
        brief: "Lowest severity that produces exit code 1 (default: error)",
        optional: true,
      },
      app: {
        kind: "parsed",
        parse: String,
        brief: "Audit one candidate application ID (default: all)",
        optional: true,
      },
      manifest: {
        kind: "parsed",
        parse: String,
        brief:
          "Evaluate against a local support manifest (YAML or JSON) instead of the bundled copy",
        optional: true,
      },
      sbom: {
        kind: "parsed",
        parse: String,
        brief:
          "Audit a CycloneDX SBOM: standalone (runtime inferred from purls), or as the graph for a detected app / --app selection",
        optional: true,
      },
      resolve: {
        kind: "boolean",
        brief: "Use installed native package managers in locked offline mode",
        optional: true,
      },
      exclude: {
        kind: "parsed",
        parse: String,
        brief:
          "Directory (relative to the project) to skip; repeat for multiple",
        optional: true,
        variadic: true,
      },
    },
    aliases: {},
  },
  docs: {
    brief: "Audit OpenTelemetry instrumentation compatibility (CI-friendly)",
    fullDescription:
      "Non-interactive compatibility check for every application in a project, in the style of\n" +
      "`npm audit`. Emits rule-based findings (OTEL001..OTEL031) with a fix hint each, and exits\n" +
      "0 (clean), 1 (findings at or above --fail-on), or 2 (tool error). Output formats: table,\n" +
      "json, sarif (GitHub code scanning), github (annotations).\n" +
      "Read-only and offline; nothing is installed, changed, or sent.",
  },
});
