import { dirname, posix } from "node:path";
import type { SnapshotFile } from "../snapshot";
import type {
  CandidateApplication,
  DetectedDependency,
  Evidence,
  LanguageId,
  PackageManager,
  PackageManagerId,
} from "../types";
import type { ApplicationDiscovery } from "../discovery/types";

export interface DetectorResult {
  candidates: CandidateApplication[];
}

export function projectDirectory(path: string) {
  const directory = dirname(path).split("\\").join("/");
  return directory === "." ? "." : directory;
}

export function relativeToProject(path: string, directory: string) {
  return directory === "." ? path : posix.relative(directory, path);
}

export function createCandidate({
  directory,
  name,
  language,
  runtime,
  version,
  packageManager,
  lockfiles = [],
  frameworks = [],
  entrypoints = [],
  dependencies = [],
  evidence = [],
  idSuffix,
  discovery,
}: {
  directory: string;
  name: string;
  language: LanguageId;
  runtime: string;
  version?: string;
  packageManager?: PackageManager;
  lockfiles?: string[];
  frameworks?: { id: string; version?: string }[];
  entrypoints?: { path: string; command?: string }[];
  dependencies?: DetectedDependency[];
  evidence?: Evidence[];
  idSuffix?: string;
  discovery?: ApplicationDiscovery;
}): CandidateApplication {
  return {
    id: `${language}:${directory}${idSuffix ? `:${idSuffix}` : ""}`,
    path: directory,
    name,
    language: { id: language, version },
    runtime: { id: runtime, version },
    frameworks,
    packageManager,
    lockfiles,
    entrypoints,
    dependencies,
    testFrameworks: [],
    containerFiles: [],
    deploymentFiles: [],
    evidence,
    diagnostics: [],
    discovery,
  };
}

export function findLocalFiles(files: SnapshotFile[], directory: string) {
  const prefix = directory === "." ? "" : `${directory}/`;
  return files.filter((file) => {
    if (!file.path.startsWith(prefix)) return false;
    return !file.path.slice(prefix.length).includes("/");
  });
}

/**
 * Files owned by one manifest directory. A nested project manifest, in any
 * of the supplied ecosystem-specific formats starts a new ownership boundary
 * and hides its subtree. Manifests from other ecosystems do not interfere with
 * polyglot projects.
 */
export function findOwnedProjectFiles(
  files: SnapshotFile[],
  directory: string,
  boundaryBasenames: readonly string[],
) {
  const boundaries = new Set(boundaryBasenames);
  const prefix = directory === "." ? "" : `${directory}/`;
  const nestedRoots = files
    .filter((file) => {
      if (!boundaries.has(posix.basename(file.path))) return false;
      const nested = projectDirectory(file.path);
      return (
        nested !== directory && (directory === "." || nested.startsWith(prefix))
      );
    })
    .map((file) => projectDirectory(file.path))
    .filter(
      (nested, index, all) =>
        !all.some(
          (parent, parentIndex) =>
            parentIndex !== index &&
            parent !== nested &&
            nested.startsWith(`${parent}/`),
        ),
    );

  return files.filter((file) => {
    if (directory !== "." && !file.path.startsWith(prefix)) return false;
    return !nestedRoots.some(
      (nested) => file.path === nested || file.path.startsWith(`${nested}/`),
    );
  });
}

export function detectLockfiles({
  files,
  directory,
  mapping,
}: {
  files: SnapshotFile[];
  directory: string;
  mapping: Record<string, PackageManagerId>;
}) {
  return findLocalFiles(files, directory)
    .filter((file) => mapping[posix.basename(file.path)] != null)
    .flatMap((file) => {
      const manager = mapping[posix.basename(file.path)];
      return manager == null
        ? []
        : [{ path: relativeToProject(file.path, directory), manager }];
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

function asRecord(entries: unknown): Record<string, unknown> {
  return entries != null &&
    typeof entries === "object" &&
    !Array.isArray(entries)
    ? (entries as Record<string, unknown>)
    : {};
}

export function namedDependencies(entries: unknown) {
  return Object.entries(asRecord(entries))
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(([name, version]) => ({
      name,
      version,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function scopedDependencies({
  entries,
  scope,
  optional = false,
}: {
  entries: unknown;
  scope: DetectedDependency["scope"];
  optional?: boolean;
}) {
  return namedDependencies(entries).map((dependency) => ({
    ...dependency,
    scope,
    optional,
    sourceKind: "manifest" as const,
  }));
}

export function safeJson(
  content: string | undefined,
): Record<string, unknown> | null {
  if (!content) return null;
  try {
    const parsed: unknown = JSON.parse(content);
    return parsed != null &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
