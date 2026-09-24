import { readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import type { Diagnostic } from "./types";
import { filesUnder } from "./file-index";

/** Counters describing how completely a project tree was scanned. */
export interface ScanCompleteness {
  filesSeen: number;
  directoriesSeen: number;
  manifestsSeen: number;
  manifestsParsed?: number;
  manifestsFailed?: number;
  lockfilesSeen: number;
  filesSkippedBySize: number;
  unreadableFiles: number;
  permissionErrors: number;
  limitReached: boolean;
}

const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".gradle",
  ".next",
  ".nuxt",
  ".output",
  ".parcel-cache",
  ".pytest_cache",
  ".tox",
  ".venv",
  "__pycache__",
  "bin",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "obj",
  "target",
  "vendor",
  "venv",
]);

const TEXT_EXTENSIONS = new Set([
  "",
  ".bazel",
  ".cs",
  ".csproj",
  ".cpp",
  ".cc",
  ".cxx",
  ".gradle",
  ".groovy",
  ".go",
  ".java",
  ".js",
  ".json",
  ".kts",
  ".lock",
  ".mjs",
  ".mod",
  ".cjs",
  ".py",
  ".rb",
  ".rs",
  ".toml",
  ".txt",
  ".ts",
  ".tsx",
  ".xml",
  ".yaml",
  ".yml",
]);

export interface SnapshotFile {
  path: string;
  size: number;
  /**
   * UTF-8 text, or undefined for binary, oversized, or unreadable files.
   * Metadata (manifests, lockfiles, build files) is read during the scan;
   * other source files are read on first access, so a large tree costs only
   * its file list until a detector inspects a source file.
   */
  content?: string;
}

export interface ProjectSnapshot {
  root: string;
  files: SnapshotFile[];
  diagnostics: Diagnostic[];
  completeness: ScanCompleteness;
}

function extension(path: string) {
  const basename = path.slice(path.lastIndexOf("/") + 1);
  const index = basename.lastIndexOf(".");
  return index <= 0 ? "" : basename.slice(index).toLowerCase();
}

function isInsideRoot(root: string, path: string) {
  const rel = relative(root, path);
  return (
    rel === "" ||
    (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel))
  );
}

/** Decode file bytes as text; undefined when the prefix contains a NUL byte. */
function decodeText(bytes: Buffer) {
  return bytes.subarray(0, 8_192).includes(0)
    ? undefined
    : bytes.toString("utf8");
}

/** A snapshot file whose content is read from disk on first access. */
function lazyTextFile(path: string, size: number, absolutePath: string) {
  let loaded = false;
  let content: string | undefined;
  const file: SnapshotFile = { path, size };
  Object.defineProperty(file, "content", {
    enumerable: true,
    get() {
      if (!loaded) {
        loaded = true;
        try {
          content = decodeText(readFileSync(absolutePath));
        } catch {
          content = undefined;
        }
      }
      return content;
    },
  });
  return file;
}

/** Normalize `--exclude` entries to root-relative POSIX directory prefixes. */
function normalizeExcludes(root: string, excludes: readonly string[]) {
  return excludes.map((exclude) => {
    const absolute = resolve(root, exclude);
    if (!isInsideRoot(root, absolute))
      throw new Error(`Excluded path is outside the project: ${exclude}`);
    return relative(root, absolute).split(sep).join("/");
  });
}

function isExcluded(relativePath: string, excludes: readonly string[]) {
  return excludes.some(
    (exclude) =>
      exclude === "" ||
      relativePath === exclude ||
      relativePath.startsWith(`${exclude}/`),
  );
}

export function createProjectSnapshot({
  targetPath,
  exclude = [],
  maxFiles = 1_000_000,
  maxDirectories = 500_000,
  maxTextBytes = 512 * 1024,
  maxMetadataBytes = 25 * 1024 * 1024,
}: {
  targetPath: string;
  /** Directories (relative to the target) to leave out of the scan. */
  exclude?: readonly string[];
  maxFiles?: number;
  maxDirectories?: number;
  maxTextBytes?: number;
  maxMetadataBytes?: number;
}): ProjectSnapshot {
  const requestedRoot = resolve(targetPath);
  const root = realpathSync(requestedRoot);
  if (!statSync(root).isDirectory()) {
    throw new Error(`Project path is not a directory: ${targetPath}`);
  }
  const excludes = normalizeExcludes(root, exclude);

  const files: SnapshotFile[] = [];
  const diagnostics: Diagnostic[] = [];
  const directories = [root];
  const completeness: ScanCompleteness = {
    filesSeen: 0,
    directoriesSeen: 0,
    manifestsSeen: 0,
    lockfilesSeen: 0,
    filesSkippedBySize: 0,
    unreadableFiles: 0,
    permissionErrors: 0,
    limitReached: false,
  };

  while (
    directories.length > 0 &&
    files.length < maxFiles &&
    completeness.directoriesSeen < maxDirectories
  ) {
    const directory = directories.pop();
    if (directory == null) break;
    completeness.directoriesSeen++;
    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    } catch {
      completeness.permissionErrors++;
      continue;
    }

    for (const entry of entries) {
      if (files.length >= maxFiles) break;
      if (entry.isSymbolicLink()) continue;
      // Hidden directories (.git, .idea, .claude/worktrees, ...) hold tooling
      // state and checkout copies, not applications.
      if (entry.isDirectory() && entry.name.startsWith(".")) continue;
      if (
        entry.isDirectory() &&
        IGNORED_DIRECTORIES.has(entry.name) &&
        !(
          entry.name === "bin" &&
          entries.some(
            (sibling) => sibling.name === "Gemfile" && sibling.isFile(),
          )
        )
      )
        continue;
      if (
        relative(root, directory).split(sep).at(-1) === "bin" &&
        entry.name !== "rails"
      )
        continue;

      const absolutePath = resolve(directory, entry.name);
      if (!isInsideRoot(root, absolutePath)) continue;
      const relativePath = relative(root, absolutePath).split(sep).join("/");
      if (isExcluded(relativePath, excludes)) continue;

      if (entry.isDirectory()) {
        directories.push(absolutePath);
        continue;
      }
      if (!entry.isFile()) continue;
      completeness.filesSeen++;

      let size: number;
      try {
        size = statSync(absolutePath).size;
      } catch {
        completeness.unreadableFiles++;
        continue;
      }
      const basename = relativePath.slice(relativePath.lastIndexOf("/") + 1);
      if (isManifestName(basename)) completeness.manifestsSeen++;
      if (isLockfileName(basename)) completeness.lockfilesSeen++;
      const metadata = isMetadataName(basename);
      if (!metadata) {
        files.push(
          size <= maxTextBytes && TEXT_EXTENSIONS.has(extension(relativePath))
            ? lazyTextFile(relativePath, size, absolutePath)
            : { path: relativePath, size },
        );
        continue;
      }
      const snapshotFile: SnapshotFile = { path: relativePath, size };
      if (size <= maxMetadataBytes) {
        let bytes: Buffer;
        try {
          bytes = readFileSync(absolutePath);
        } catch {
          completeness.unreadableFiles++;
          diagnostics.push({
            code: "METADATA_UNREADABLE",
            severity: "error",
            message: `Could not read metadata file: ${relativePath}`,
            path: relativePath,
          });
          files.push(snapshotFile);
          continue;
        }
        snapshotFile.content = decodeText(bytes);
      } else {
        completeness.filesSkippedBySize++;
        diagnostics.push({
          code: "METADATA_TOO_LARGE",
          severity: "error",
          message: `Metadata file exceeds ${String(maxMetadataBytes)} bytes: ${relativePath}`,
          path: relativePath,
        });
      }
      files.push(snapshotFile);
    }
  }

  if (
    files.length >= maxFiles ||
    completeness.directoriesSeen >= maxDirectories
  ) {
    completeness.limitReached = true;
    diagnostics.push({
      code: "SCAN_LIMIT_REACHED",
      severity: "warning",
      message: `Stopped after reaching a scan limit (${String(maxFiles)} files or ${String(maxDirectories)} directories); audit a subdirectory or pass --exclude for directories without applications`,
    });
  }

  files.sort((a, b) => a.path.localeCompare(b.path));
  return { root, files, diagnostics, completeness };
}

const MANIFEST_NAMES = new Set([
  "package.json",
  "pyproject.toml",
  "requirements.txt",
  "Pipfile",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "Gemfile",
  "composer.json",
  "Cargo.toml",
  "go.mod",
  "mix.exs",
  "rebar.config",
  "CMakeLists.txt",
  "conanfile.txt",
  "cpanfile",
]);

const LOCKFILE_NAMES = new Set([
  "package-lock.json",
  "npm-shrinkwrap.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
  "poetry.lock",
  "uv.lock",
  "Pipfile.lock",
  "Gemfile.lock",
  "packages.lock.json",
  "composer.lock",
]);

const AUXILIARY_METADATA_NAMES = new Set([
  "BUILD",
  "BUILD.bazel",
  "MODULE.bazel",
  "WORKSPACE",
  "WORKSPACE.bazel",
  "REPO.bazel",
  "pnpm-workspace.yaml",
  ".nvmrc",
  ".node-version",
  ".ruby-version",
  ".python-version",
  ".java-version",
  ".tool-versions",
  ".sdkmanrc",
  "runtime.txt",
  "Dockerfile",
]);

function isManifestName(name: string) {
  return MANIFEST_NAMES.has(name) || name.endsWith(".csproj");
}

function isLockfileName(name: string) {
  return LOCKFILE_NAMES.has(name);
}

function isMetadataName(name: string) {
  return (
    isManifestName(name) ||
    isLockfileName(name) ||
    AUXILIARY_METADATA_NAMES.has(name) ||
    name.startsWith("Dockerfile.")
  );
}

export function filesBelow(snapshot: ProjectSnapshot, directory: string) {
  if (directory === ".") return snapshot.files;
  return filesUnder(snapshot.files, directory);
}

const parsedContents = new WeakMap<object, Map<string, unknown>>();

/**
 * Parse a snapshot file's content once per parser key and share the result.
 * Workspace lockfiles are read by every member application; parsing a large
 * pnpm or uv lockfile per member dominated the audit of a monorepo. Callers
 * must treat the returned value as read-only. A parser that throws caches
 * `undefined`.
 */
export function parseSnapshotFile<T>(
  file: Pick<SnapshotFile, "content">,
  key: string,
  parse: (content: string) => T,
): T | undefined {
  let cache = parsedContents.get(file);
  if (cache == null) {
    cache = new Map();
    parsedContents.set(file, cache);
  }
  if (cache.has(key)) return cache.get(key) as T | undefined;
  let value: T | undefined;
  try {
    value = file.content == null ? undefined : parse(file.content);
  } catch {
    value = undefined;
  }
  cache.set(key, value);
  return value;
}
