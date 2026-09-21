import { existsSync, lstatSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const WORKSPACE_MARKERS = [
  "MODULE.bazel",
  "WORKSPACE.bazel",
  "WORKSPACE",
  "REPO.bazel",
];
const MAX_BZL_BYTES = 1024 * 1024;

/** A resolved `.bzl` module: its absolute path and contents. */
export interface BzlModule {
  absPath: string;
  content: string;
}

/**
 * Resolve a `load()` label to a `.bzl` module, or null when it cannot be read
 * from the working tree (external repos, off-disk, oversized). `fromAbsDir` is
 * the absolute directory of the file performing the load, used for
 * package-relative labels.
 */
export type BzlLoader = (label: string, fromAbsDir: string) => BzlModule | null;

/**
 * Ascend the real filesystem from `startAbsDir` to the enclosing Bazel
 * workspace root (first ancestor carrying a workspace marker). Falls back to
 * `startAbsDir` when no marker is found, so `//` labels still resolve against a
 * sensible base.
 */
export function findWorkspaceRoot(startAbsDir: string): string {
  let dir = startAbsDir;
  for (;;) {
    if (WORKSPACE_MARKERS.some((marker) => existsSync(join(dir, marker))))
      return dir;
    const parent = dirname(dir);
    if (parent === dir) return startAbsDir;
    dir = parent;
  }
}

/**
 * Resolve a Bazel `load()` label to an absolute path. `//pkg:file.bzl` is
 * workspace-root-relative; `:file.bzl` and bare `file.bzl` are relative to the
 * loading file's package; `@repo//...` (external) returns null.
 */
export function resolveLabelToPath(
  label: string,
  { workspaceRoot, fromAbsDir }: { workspaceRoot: string; fromAbsDir: string },
): string | null {
  if (label.startsWith("@")) return null;
  if (label.startsWith("//")) {
    const rest = label.slice(2);
    const [pkg, file] = rest.includes(":")
      ? (rest.split(":") as [string, string])
      : ["", rest];
    return join(workspaceRoot, pkg, file);
  }
  if (label.startsWith(":")) return join(fromAbsDir, label.slice(1));
  if (label.includes(":")) {
    const [pkg, file] = label.split(":") as [string, string];
    return join(workspaceRoot, pkg, file);
  }
  return join(fromAbsDir, label);
}

/**
 * Default loader that reads in-workspace `.bzl` files from disk with guarded
 * I/O (regular file, no symlink, bounded size). The workspace root is resolved
 * once by ascending from `snapshotRoot`.
 */
export function createDiskBzlLoader(snapshotRoot: string): BzlLoader {
  const workspaceRoot = findWorkspaceRoot(snapshotRoot);
  return (label, fromAbsDir) => {
    const path = resolveLabelToPath(label, { workspaceRoot, fromAbsDir });
    if (path == null) return null;
    try {
      const stat = lstatSync(path);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_BZL_BYTES)
        return null;
      return { absPath: path, content: readFileSync(path, "utf8") };
    } catch {
      return null;
    }
  };
}
