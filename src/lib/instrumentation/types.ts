import type { CompatibilityProfile } from "./manifest/profile";
import type { ManifestInfo } from "./manifest/load";
import type { GraphCompleteness, GraphProvenance } from "./graph/types";
import type { ApplicationDiscovery } from "./discovery/types";

export const INSTRUMENTATION_SCHEMA_VERSION = "6" as const;

export type LanguageId =
  | "nodejs"
  | "python"
  | "java"
  | "dotnet"
  | "ruby"
  | "php"
  // Runtimes with no manifest-detectable auto-instrumentation path (SDK only),
  // plus runtimes OpenTelemetry does not support at all (e.g. perl). These carry
  // no package matrix; the compatibility check reports the runtime-level verdict.
  | "go"
  | "rust"
  | "erlang"
  | "cpp"
  | "perl";
export type PackageManagerId =
  | "npm"
  | "pnpm"
  | "yarn"
  | "bun"
  | "pip"
  | "poetry"
  | "uv"
  | "pipenv"
  | "maven"
  | "gradle"
  | "dotnet"
  | "bundler"
  | "composer";
export type ResultStatus =
  | "ready"
  | "incomplete"
  | "manual"
  | "ambiguous"
  | "unsupported";
export type DiagnosticSeverity = "info" | "warning" | "error";
export type DiagnosticCode =
  | "NO_CANDIDATE"
  | "MULTIPLE_CANDIDATES"
  | "MULTIPLE_LOCKFILES"
  | "PACKAGE_MANAGER_CONFLICT"
  | "UNSUPPORTED_FRAMEWORK"
  | "PATH_OUTSIDE_ROOT"
  | "LOCKFILE_UNPARSEABLE"
  | "SBOM_DANGLING_REF"
  | "UV_GRAPH_INCOMPLETE"
  | "PNPM_GRAPH_INCOMPLETE"
  | "METADATA_UNREADABLE"
  | "METADATA_TOO_LARGE"
  | "SCAN_LIMIT_REACHED"
  | "DYNAMIC_TARGET_NAME"
  | "COMPUTED_TESTONLY"
  | "AMBIGUOUS_BUILD_PACKAGE";

export type DependencyScope =
  | "runtime"
  | "development"
  | "test"
  | "build"
  | "peer"
  | "optional"
  | "unknown";
export type DependencySourceKind =
  | "manifest"
  | "lockfile"
  | "framework-reference"
  | "inherited-version";

export interface Evidence {
  kind:
    | "manifest"
    | "lockfile"
    | "runtime-version"
    | "dependency"
    | "entrypoint"
    | "configuration"
    | "environment";
  path: string;
  key?: string;
  value?: string;
}

export interface Diagnostic {
  code: DiagnosticCode;
  severity: DiagnosticSeverity;
  message: string;
  path?: string;
}

export interface DetectedDependency {
  name: string;
  version?: string;
  resolvedVersion?: string;
  scope?: DependencyScope;
  optional?: boolean;
  sourceKind?: DependencySourceKind;
  purl?: string;
  depth?: number;
  via?: string[];
  paths?: string[][];
  category:
    | "web-http"
    | "web-rpc"
    | "orm"
    | "database"
    | "cache"
    | "messaging"
    | "instrumentation"
    | "other";
}

export interface PackageManager {
  id: PackageManagerId;
  lockfile?: string;
  source: "manifest" | "lockfile" | "default";
}

export interface CandidateApplication {
  id: string;
  path: string;
  name: string;
  language: { id: LanguageId; version?: string };
  runtime: { id: string; version?: string; moduleSystem?: "esm" | "commonjs" };
  frameworks: { id: string; version?: string }[];
  packageManager?: PackageManager;
  lockfiles: string[];
  entrypoints: { path: string; command?: string }[];
  dependencies: DetectedDependency[];
  testFrameworks: string[];
  containerFiles: string[];
  deploymentFiles: string[];
  /**
   * Compatibility profile from the OpenTelemetry support manifest — the
   * design's per-application signals. Populated during detection.
   */
  compatibility?: CompatibilityProfile;
  dependencyGraph?: {
    completeness: GraphCompleteness;
    provenance: GraphProvenance;
    root: string;
    nodeCount: number;
    edgeCount: number;
  };
  discovery?: ApplicationDiscovery;
  evidence: Evidence[];
  diagnostics: Diagnostic[];
}

export interface InstrumentationResult {
  schemaVersion: typeof INSTRUMENTATION_SCHEMA_VERSION;
  root: string;
  status: ResultStatus;
  /** The support manifest these verdicts were evaluated against. */
  manifest: ManifestInfo;
  candidates: CandidateApplication[];
  diagnostics: Diagnostic[];
  selection: string | null;
}
