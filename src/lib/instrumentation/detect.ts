import type { ProjectSnapshot } from "./snapshot";
import type { CandidateApplication, Diagnostic } from "./types";
import { detectDotnet } from "./detectors/dotnet";
import { detectJava } from "./detectors/java";
import { detectNodejs } from "./detectors/nodejs";
import { detectPython } from "./detectors/python";
import { detectRuby } from "./detectors/ruby";
import { detectPhp } from "./detectors/php";
import { nativeApplicationProvider } from "./detectors/native";
import { checkCompatibility } from "./manifest/check";
import { loadManifest } from "./manifest/load";
import { applyResolvedVersions, resolveFromLockfiles } from "./lockfiles";
import { detectRuntimeVersion } from "./runtime-version";
import type { LanguageId } from "./types";
import { uvLockProvider } from "./graph/providers/uv-lock";
import { pnpmLockProvider } from "./graph/providers/pnpm-lock";
import { selectGraph } from "./graph/provider";
import { applyGraph } from "./graph/apply";
import { bazelApplicationProvider } from "./discovery/bazel/provider";
import { fileAt } from "./file-index";

/** Lockfiles each runtime's detector may find beside its manifest. */
const LOCKFILES_BY_LANGUAGE: Partial<Record<LanguageId, string[]>> = {
  nodejs: [
    "package-lock.json",
    "npm-shrinkwrap.json",
    "pnpm-lock.yaml",
    "yarn.lock",
  ],
  python: ["poetry.lock", "uv.lock", "Pipfile.lock"],
  ruby: ["Gemfile.lock"],
  dotnet: ["packages.lock.json"],
  php: ["composer.lock"],
};

/**
 * Replace declared ranges with lockfile-resolved versions where a lockfile
 * exists, and fill in the runtime version from version files or a Dockerfile
 * when the manifest did not declare one.
 */
function resolveEvidence(
  snapshot: ProjectSnapshot,
  candidate: CandidateApplication,
) {
  const graph = selectGraph({
    providers: [uvLockProvider, pnpmLockProvider],
    input: { candidate, snapshot },
  });
  if (graph != null) {
    applyGraph({ candidate, graph });
  } else {
    const basenames = LOCKFILES_BY_LANGUAGE[candidate.language.id];
    if (basenames != null) {
      const { resolved, parsed, unparseable } = resolveFromLockfiles({
        files: snapshot.files,
        directory: candidate.path,
        basenames,
      });
      candidate.dependencies = applyResolvedVersions(
        candidate.dependencies,
        resolved,
      );
      for (const path of parsed)
        candidate.evidence.push({ kind: "lockfile", path });
      for (const path of unparseable)
        candidate.diagnostics.push({
          code: "LOCKFILE_UNPARSEABLE",
          severity: "warning",
          message: `Could not parse ${path}; falling back to declared version ranges`,
          path,
        });
    }
  }

  inheritNodeRuntimeVersion(snapshot, candidate);
  if (candidate.language.version == null) {
    const found = detectRuntimeVersion({
      files: snapshot.files,
      directory: candidate.path,
      runtime: candidate.language.id,
    });
    if (found != null) {
      candidate.language.version = found.version;
      candidate.runtime.version ??= found.version;
      candidate.evidence.push(found.evidence);
    }
  }
}

function inheritNodeRuntimeVersion(
  snapshot: ProjectSnapshot,
  candidate: CandidateApplication,
) {
  if (candidate.language.id !== "nodejs" || candidate.language.version != null)
    return;
  const parts = candidate.path === "." ? [] : candidate.path.split("/");
  while (parts.length > 0) {
    parts.pop();
    const path =
      parts.length === 0 ? "package.json" : `${parts.join("/")}/package.json`;
    const manifest = fileAt(snapshot.files, path);
    if (manifest?.content == null) continue;
    try {
      const json = JSON.parse(manifest.content) as {
        engines?: { node?: unknown };
      };
      if (typeof json.engines?.node !== "string") continue;
      candidate.language.version = json.engines.node;
      candidate.runtime.version = json.engines.node;
      candidate.evidence.push({
        kind: "runtime-version",
        path,
        key: "engines.node",
        value: json.engines.node,
      });
      return;
    } catch {
      continue;
    }
  }
}

function auditCandidate(
  snapshot: ProjectSnapshot,
  candidate: CandidateApplication,
) {
  resolveEvidence(snapshot, candidate);
  candidate.dependencies.sort((a, b) => a.name.localeCompare(b.name));
  candidate.evidence.sort(
    (a, b) =>
      a.path.localeCompare(b.path) || (a.key ?? "").localeCompare(b.key ?? ""),
  );
  candidate.diagnostics.sort((a, b) => a.code.localeCompare(b.code));
  candidate.compatibility = checkCompatibility({
    candidate,
    manifest: loadManifest(),
  });
  return candidate;
}

export function detectApplications(snapshot: ProjectSnapshot) {
  const native = nativeApplicationProvider.discover(snapshot);
  const ecosystemCandidates = [
    ...detectNodejs(snapshot),
    ...detectPython(snapshot),
    ...detectJava(snapshot),
    ...detectDotnet(snapshot),
    ...detectRuby(snapshot),
    ...detectPhp(snapshot),
    ...native.candidates,
  ];
  const bazel = bazelApplicationProvider.discover(snapshot);
  const bazelKeys = new Set(
    bazel.candidates.map(
      (candidate) => `${candidate.language.id}\0${candidate.path}`,
    ),
  );
  const candidates = [
    ...ecosystemCandidates.filter(
      (candidate) =>
        !bazelKeys.has(`${candidate.language.id}\0${candidate.path}`),
    ),
    ...bazel.candidates.map((candidate) =>
      enrichBazelCandidate(candidate, ecosystemCandidates),
    ),
  ];
  candidates.map((candidate) => auditCandidate(snapshot, candidate));
  candidates.sort((a, b) => a.id.localeCompare(b.id));
  const diagnostics: Diagnostic[] = [
    ...snapshot.diagnostics,
    ...native.diagnostics,
    ...bazel.diagnostics,
  ];
  if (candidates.length === 0)
    diagnostics.push({
      code: "NO_CANDIDATE",
      severity: "error",
      message: "No supported runnable application found",
    });
  if (candidates.length > 1)
    diagnostics.push({
      code: "MULTIPLE_CANDIDATES",
      severity: "warning",
      message: `Found ${candidates.length} candidate applications; select one with --app`,
    });
  diagnostics.sort((a, b) => a.code.localeCompare(b.code));
  return { candidates, diagnostics };
}

function enrichBazelCandidate(
  candidate: CandidateApplication,
  ecosystemCandidates: CandidateApplication[],
) {
  const matches = ecosystemCandidates.filter(
    (existing) =>
      existing.language.id === candidate.language.id &&
      existing.path === candidate.path,
  );
  if (matches.length !== 1) return candidate;
  const existing = matches[0];
  if (existing == null) return candidate;
  candidate.language.version = existing.language.version;
  candidate.runtime.version = existing.runtime.version;
  candidate.runtime.moduleSystem = existing.runtime.moduleSystem;
  candidate.frameworks = existing.frameworks;
  candidate.packageManager = existing.packageManager;
  candidate.lockfiles = existing.lockfiles;
  candidate.dependencies = existing.dependencies;
  candidate.evidence.push(...existing.evidence);
  candidate.diagnostics.push(...existing.diagnostics);
  return candidate;
}
