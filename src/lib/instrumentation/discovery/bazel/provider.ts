import { join, posix } from "node:path";
import { parse as parseToml } from "smol-toml";
import type { ProjectSnapshot, SnapshotFile } from "../../snapshot";
import type { CandidateApplication, Diagnostic, LanguageId } from "../../types";
import { createCandidate, projectDirectory } from "../../detectors/common";
import type {
  ApplicationDiscoveryProvider,
  ApplicationDiscoveryResult,
  DiscoveryCompleteness,
} from "../types";
import {
  parseBazelLoads,
  parseBazelRuleCalls,
  type BazelLiteral,
} from "./parser";
import { fileAt, joinPath, nearestAncestorFile } from "../../file-index";
import { createDiskBzlLoader, type BzlLoader } from "./labels";
import { buildMacroFamilyMap, resolveCallRule, type Family } from "./macros";

const WORKSPACE_FILES = new Set([
  "MODULE.bazel",
  "WORKSPACE.bazel",
  "WORKSPACE",
  "REPO.bazel",
]);

const RULE_FAMILIES: Record<string, Family> = {
  cc_binary: { rule: "cc_binary", language: "cpp", runtime: "cpp" },
  go_binary: { rule: "go_binary", language: "go", runtime: "go" },
  py_binary: { rule: "py_binary", language: "python", runtime: "python" },
  java_binary: { rule: "java_binary", language: "java", runtime: "jvm" },
  rust_binary: { rule: "rust_binary", language: "rust", runtime: "rust" },
};

export const bazelApplicationProvider: ApplicationDiscoveryProvider = {
  id: "bazel-static",
  discover(snapshot) {
    return discoverBazelApplications(snapshot);
  },
};

function absoluteDir(root: string, packageDir: string) {
  return packageDir === "." ? root : join(root, packageDir);
}

function buildLoadBindings(content: string) {
  const bindings = new Map<string, string>();
  for (const load of parseBazelLoads(content))
    for (const symbol of load.symbols)
      bindings.set(symbol.local, symbol.exported);
  return bindings;
}

export function discoverBazelApplications(
  snapshot: ProjectSnapshot,
  options: { loadBzl?: BzlLoader } = {},
): ApplicationDiscoveryResult {
  const candidates: CandidateApplication[] = [];
  const diagnostics: Diagnostic[] = [];
  const roots = bazelWorkspaceRoots(snapshot.files);
  const packages = new Map<string, SnapshotFile[]>();

  for (const file of snapshot.files) {
    if (!["BUILD", "BUILD.bazel"].includes(posix.basename(file.path))) continue;
    const workspaceRoot = nearestWorkspaceRoot(
      projectDirectory(file.path),
      roots,
    );
    const key = `${workspaceRoot}\0${projectDirectory(file.path)}`;
    const manifests = packages.get(key) ?? [];
    manifests.push(file);
    packages.set(key, manifests);
  }

  // Derive which macros delegate to a well-known *_binary rule by reading the
  // in-repo .bzl load-closure of the audited BUILD files. Anything not in the
  // resulting map is simply not detected.
  const loadBzl = options.loadBzl ?? createDiskBzlLoader(snapshot.root);
  const buildLoads = snapshot.files
    .filter((file) =>
      ["BUILD", "BUILD.bazel"].includes(posix.basename(file.path)),
    )
    .flatMap((file) =>
      parseBazelLoads(file.content ?? "").map((load) => ({
        label: load.label,
        fromAbsDir: absoluteDir(snapshot.root, projectDirectory(file.path)),
      })),
    );
  const family = buildMacroFamilyMap({
    buildLoads,
    loadBzl,
    seeds: RULE_FAMILIES,
  });

  for (const [key, manifests] of packages) {
    const [workspaceRoot, directory] = key.split("\0") as [string, string];
    if (manifests.length > 1) {
      diagnostics.push({
        code: "AMBIGUOUS_BUILD_PACKAGE",
        severity: "warning",
        message: `Both BUILD and BUILD.bazel define Bazel package ${bazelPackage(workspaceRoot, directory)}`,
        path: directory,
      });
      continue;
    }
    const manifest = manifests[0];
    if (manifest == null) continue;
    const bindings = buildLoadBindings(manifest.content ?? "");
    for (const call of parseBazelRuleCalls(manifest.content ?? "")) {
      const resolved = resolveCallRule(
        call.rule,
        bindings,
        family,
        RULE_FAMILIES,
      );
      if (resolved == null) continue;
      const name = call.attributes.get("name");
      if (name?.kind !== "string") {
        diagnostics.push({
          code: "DYNAMIC_TARGET_NAME",
          severity: "warning",
          message: `${call.rule} has a computed or missing name and cannot be identified statically`,
          path: manifest.path,
        });
        continue;
      }
      const testonly = call.attributes.get("testonly");
      if (testonly?.kind === "boolean" && testonly.value) continue;

      const candidateDiagnostics: Diagnostic[] = [];
      let completeness: DiscoveryCompleteness = "resolved";
      if (testonly?.kind === "dynamic") {
        completeness = "partial";
        candidateDiagnostics.push({
          code: "COMPUTED_TESTONLY",
          severity: "info",
          message: `${call.rule} target ${name.value} has computed testonly; application status may be conditional`,
          path: manifest.path,
        });
      }

      const target = `${bazelPackage(workspaceRoot, directory)}:${name.value}`;
      const entrypoints = literalEntrypoints({
        family: resolved.rule,
        directory,
        attributes: call.attributes,
      });
      const inherited = inheritedRuntimeVersion({
        files: snapshot.files,
        directory,
        language: resolved.language,
      });
      const workspaceVersion =
        inherited == null
          ? bazelWorkspaceVersion({
              files: snapshot.files,
              workspaceRoot,
              language: resolved.language,
            })
          : undefined;
      const candidate = createCandidate({
        directory,
        target: name.value,
        name: name.value,
        language: resolved.language,
        runtime: resolved.runtime,
        version: inherited ?? workspaceVersion?.value,
        entrypoints,
        evidence: [
          {
            kind: "manifest",
            path: manifest.path,
            key: "target",
            value: target,
          },
          ...(workspaceVersion == null
            ? []
            : [{ kind: "runtime-version" as const, ...workspaceVersion }]),
        ],
        discovery: {
          completeness,
          provenance: {
            provider: "bazel-static",
            path: manifest.path,
            workspaceRoot,
            target,
            rule: call.rule,
          },
        },
      });
      candidate.diagnostics.push(...candidateDiagnostics);
      candidates.push(candidate);
    }
  }

  return { candidates, diagnostics };
}

function bazelWorkspaceRoots(files: SnapshotFile[]) {
  const roots = new Set<string>(["."]);
  for (const file of files)
    if (WORKSPACE_FILES.has(posix.basename(file.path)))
      roots.add(projectDirectory(file.path));
  return [...roots].sort((left, right) => left.length - right.length);
}

function nearestWorkspaceRoot(directory: string, roots: string[]) {
  return (
    roots
      .filter(
        (root) =>
          root === "." ||
          directory === root ||
          directory.startsWith(`${root}/`),
      )
      .sort((left, right) => right.length - left.length)[0] ?? "."
  );
}

function bazelPackage(workspaceRoot: string, directory: string) {
  const relative =
    workspaceRoot === "."
      ? directory
      : posix.relative(workspaceRoot, directory);
  return relative === "." ? "//" : `//${relative}`;
}

function literalEntrypoints({
  family,
  directory,
  attributes,
}: {
  family: string;
  directory: string;
  attributes: Map<string, BazelLiteral>;
}) {
  const mainClass = attributes.get("main_class");
  if (family === "java_binary" && mainClass?.kind === "string")
    return [{ path: directory, command: mainClass.value }];
  const srcs = attributes.get("srcs");
  if (srcs?.kind !== "strings") return [];
  return srcs.value.map((source) => ({
    path: directory === "." ? source : `${directory}/${source}`,
  }));
}

function inheritedRuntimeVersion({
  files,
  directory,
  language,
}: {
  files: SnapshotFile[];
  directory: string;
  language: LanguageId;
}) {
  const names: Partial<Record<LanguageId, string[]>> = {
    python: ["pyproject.toml"],
    go: ["go.mod"],
    rust: ["Cargo.toml"],
    java: ["pom.xml", "build.gradle", "build.gradle.kts"],
  };
  const basenames = names[language];
  if (basenames == null) return undefined;
  const manifest = nearestAncestorFile(files, directory, basenames);
  if (manifest?.content == null) return undefined;
  switch (language) {
    case "python": {
      try {
        const parsed = parseToml(manifest.content) as Record<string, unknown>;
        const project = asRecord(parsed.project);
        const poetry = asRecord(asRecord(parsed.tool)?.poetry);
        const poetryPython = asRecord(poetry?.dependencies)?.python;
        return typeof project?.["requires-python"] === "string"
          ? project["requires-python"]
          : typeof poetryPython === "string"
            ? poetryPython
            : undefined;
      } catch {
        return undefined;
      }
    }
    case "go":
      return /^go\s+(\d+(?:\.\d+){1,2})/m.exec(manifest.content)?.[1];
    case "rust": {
      try {
        const pkg = asRecord(
          (parseToml(manifest.content) as Record<string, unknown>).package,
        );
        return typeof pkg?.["rust-version"] === "string"
          ? pkg["rust-version"]
          : undefined;
      } catch {
        return undefined;
      }
    }
    case "java": {
      const maven =
        /<(?:java\.version|maven\.compiler\.(?:release|source|target))>([^<]+)<\//i.exec(
          manifest.content,
        )?.[1];
      const gradle =
        /JavaLanguageVersion\.of\(\s*(\d+)\s*\)|sourceCompatibility\s*=?\s*['"]?(\d+(?:\.\d+)?)/.exec(
          manifest.content,
        );
      return maven ?? gradle?.[1] ?? gradle?.[2];
    }
    default:
      return undefined;
  }
}

/**
 * The Java or Python version a Bazel workspace builds with, from the
 * workspace's own `.bazelrc` and `MODULE.bazel`. Only `build` and `common`
 * lines count, since they apply to every build; config-specific lines
 * (`build:ci`) and imported rc files are not followed. The last matching flag
 * wins, as in Bazel. Java reads `--java_runtime_version`, the JVM the target
 * runs on; a non-numeric value such as `local_jdk` stays unknown.
 */
function bazelWorkspaceVersion({
  files,
  workspaceRoot,
  language,
}: {
  files: SnapshotFile[];
  workspaceRoot: string;
  language: LanguageId;
}): { path: string; key: string; value: string } | undefined {
  if (language !== "java" && language !== "python") return undefined;
  const rcPath = joinPath(workspaceRoot, ".bazelrc");
  const flag =
    language === "java"
      ? /^--java_runtime_version=(\S+)$/
      : /^--@{1,2}rules_python\/\/python\/config_settings:python_version=(\S+)$/;
  let rcValue: string | undefined;
  for (const line of fileAt(files, rcPath)?.content?.split("\n") ?? []) {
    const [command, ...options] = line.trim().split(/\s+/);
    if (command !== "build" && command !== "common") continue;
    for (const option of options) {
      const value = flag.exec(option)?.[1];
      if (value != null) rcValue = value;
    }
  }
  if (rcValue != null) {
    const version =
      language === "java"
        ? /^(?:remotejdk_?)?(\d+)$/.exec(rcValue)?.[1]
        : /^\d+\.\d+(?:\.\d+)?$/.exec(rcValue)?.[0];
    return version == null
      ? undefined
      : {
          path: rcPath,
          key:
            language === "java" ? "--java_runtime_version" : "python_version",
          value: version,
        };
  }
  if (language !== "python") return undefined;
  const modulePath = joinPath(workspaceRoot, "MODULE.bazel");
  const toolchains = [
    ...(fileAt(files, modulePath)?.content ?? "").matchAll(
      /\b\w+\.toolchain\(([^)]*)\)/g,
    ),
  ].flatMap((match) => {
    const args = match[1] ?? "";
    const version = /\bpython_version\s*=\s*"(\d+\.\d+(?:\.\d+)?)"/.exec(
      args,
    )?.[1];
    return version == null
      ? []
      : [{ version, isDefault: /\bis_default\s*=\s*True\b/.test(args) }];
  });
  const chosen =
    toolchains.length === 1
      ? toolchains[0]
      : toolchains.filter((toolchain) => toolchain.isDefault).length === 1
        ? toolchains.find((toolchain) => toolchain.isDefault)
        : undefined;
  return chosen == null
    ? undefined
    : { path: modulePath, key: "python.toolchain", value: chosen.version };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
