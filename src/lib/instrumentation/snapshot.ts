import {
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import type { Diagnostic } from "./types";

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

export function createProjectSnapshot({
  targetPath,
  maxFiles = 200_000,
  maxDirectories = 100_000,
  maxTextBytes = 512 * 1024,
  maxMetadataBytes = 25 * 1024 * 1024,
}: {
  targetPath: string;
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
      if (lstatSync(absolutePath).isSymbolicLink()) continue;

      if (entry.isDirectory()) {
        directories.push(absolutePath);
        continue;
      }
      if (!entry.isFile()) continue;
      completeness.filesSeen++;

      const relativePath = relative(root, absolutePath).split(sep).join("/");
      let size: number;
      try {
        size = statSync(absolutePath).size;
      } catch {
        completeness.unreadableFiles++;
        continue;
      }
      const snapshotFile: SnapshotFile = { path: relativePath, size };
      const basename = relativePath.slice(relativePath.lastIndexOf("/") + 1);
      if (isManifestName(basename)) completeness.manifestsSeen++;
      if (isLockfileName(basename)) completeness.lockfilesSeen++;
      const metadata = isMetadataName(basename);
      const readLimit = metadata ? maxMetadataBytes : maxTextBytes;
      if (
        size <= readLimit &&
        (metadata || TEXT_EXTENSIONS.has(extension(relativePath)))
      ) {
        let bytes: Buffer;
        try {
          bytes = readFileSync(absolutePath);
        } catch {
          completeness.unreadableFiles++;
          if (metadata)
            diagnostics.push({
              code: "METADATA_UNREADABLE",
              severity: "error",
              message: `Could not read metadata file: ${relativePath}`,
              path: relativePath,
            });
          files.push(snapshotFile);
          continue;
        }
        if (!bytes.subarray(0, 8_192).includes(0)) {
          snapshotFile.content = bytes.toString("utf8");
        }
      } else if (size > readLimit && metadata) {
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
      message: "Stopped after reaching a scan limit",
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
  const prefix = `${directory}/`;
  return snapshot.files.filter(
    (file) => file.path === directory || file.path.startsWith(prefix),
  );
}
