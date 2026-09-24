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
  type InstrumentationResult,
} from "../../lib/instrumentation/types";
import {
  deriveFindings,
  hasFindingAtOrAbove,
  type Finding,
} from "../../lib/instrumentation/findings";
import { toSarif } from "../../lib/instrumentation/formats/sarif";
import { toGithubAnnotations } from "../../lib/instrumentation/formats/github";
import { loadCycloneDx } from "../../lib/instrumentation/graph/providers/cyclonedx";
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
}

export interface AuditDeps {
  createSnapshot?: typeof createProjectSnapshot;
  buildNpmGraph?: typeof buildNpmArboristGraph;
  resolveNativeGraph?: typeof resolveNative;
}

/** Exit codes: 0 clean, 1 findings at or above --fail-on, 2 tool error. */
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

export async function audit(
  this: LocalContext,
  flags: AuditFlags,
  targetPath = ".",
  deps: AuditDeps = {},
): Promise<void> {
  const { process, writer: baseWriter } = this;
  const format = flags.format ?? "table";
  const failOn = flags["fail-on"] ?? "error";
  const writer = muteStatusWriter(baseWriter, { muted: format !== "table" });
  const createSnapshot = deps.createSnapshot ?? createProjectSnapshot;
  const buildNpmGraph = deps.buildNpmGraph ?? buildNpmArboristGraph;
  const resolveNativeGraph = deps.resolveNativeGraph ?? resolveNative;
  const root = resolve(process.cwd(), targetPath);

  try {
    if (flags.manifest)
      setManifestOverride(
        loadManifestFile(resolve(process.cwd(), flags.manifest)),
      );

    const snapshot = createSnapshot({ targetPath: root });
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
      ? detection.candidates.filter((candidate) => candidate.id === flags.app)
      : detection.candidates;
    if (flags.app && candidates.length === 0)
      throw new Error(`Candidate not found: ${flags.app}`);
    for (const candidate of candidates) {
      let graph =
        candidate.dependencyGraph == null
          ? await buildNpmGraph({ candidate, snapshot })
          : null;
      if (graph == null && flags.resolve)
        graph = resolveNativeGraph({ candidate, snapshot });
      if (graph != null) {
        applyGraph({ candidate, graph });
        candidate.compatibility = checkCompatibility({
          candidate,
          manifest: loadManifest(),
        });
      }
    }
    if (flags.sbom) {
      const candidate = candidates[0];
      if (candidates.length !== 1 || candidate == null)
        throw new Error(
          "--sbom requires exactly one selected candidate; pass --app <id>",
        );
      applyGraph({
        candidate,
        graph: loadCycloneDx(resolve(process.cwd(), flags.sbom)),
      });
      candidate.compatibility = checkCompatibility({
        candidate,
        manifest: loadManifest(),
      });
    }

    // MULTIPLE_CANDIDATES is irrelevant here: audit evaluates every candidate.
    const diagnostics = detection.diagnostics.filter(
      (diagnostic) => diagnostic.code !== "MULTIPLE_CANDIDATES",
    );
    const result: InstrumentationResult = {
      schemaVersion: INSTRUMENTATION_SCHEMA_VERSION,
      root: snapshot.root,
      status: candidates.length === 0 ? "unsupported" : "ready",
      manifest: manifestInfo(),
      candidates,
      diagnostics,
      selection: flags.app ?? null,
    };

    const findings = deriveFindings(result);

    const analysisFailed =
      candidates.length === 0 ||
      [
        ...diagnostics,
        ...candidates.flatMap((candidate) => candidate.diagnostics),
      ].some((diagnostic) => diagnostic.severity === "error");

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
              root: snapshot.root,
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
        writer.write(renderAudit({ result, candidates, findings }));
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
        brief: "Use a CycloneDX JSON graph for the selected candidate",
        optional: true,
      },
      resolve: {
        kind: "boolean",
        brief: "Use installed native package managers in locked offline mode",
        optional: true,
      },
    },
    aliases: {},
  },
  docs: {
    brief: "Audit OpenTelemetry instrumentation compatibility (CI-friendly)",
    fullDescription:
      "Non-interactive compatibility check for every application in a project, in the style of\n" +
      "`npm audit`. Emits rule-based findings (OTEL001..OTEL021) with a fix hint each, and exits\n" +
      "0 (clean), 1 (findings at or above --fail-on), or 2 (tool error). Output formats: table,\n" +
      "json, sarif (GitHub code scanning), github (annotations).\n" +
      "Read-only and offline; nothing is installed, changed, or sent.",
  },
});
