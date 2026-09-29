import type { SnapshotFile } from "./snapshot";

/**
 * Path lookups over a snapshot's file list. Detectors and graph providers ask
 * the same questions per candidate ("is there a lockfile here?", "which files
 * does this project own?"); answering them with a linear scan of the whole
 * list made a large monorepo quadratic. The index is built once per file
 * array and reused, so the array must not be mutated after the first lookup.
 */
interface FileIndex {
  byPath: Map<string, SnapshotFile>;
  /** Snapshot order, used to return subtree results in the list's order. */
  order: Map<SnapshotFile, number>;
  /** Files directly inside a directory, keyed by "." for the root. */
  filesIn: Map<string, SnapshotFile[]>;
  /** Immediate subdirectories of a directory. */
  subdirectories: Map<string, string[]>;
}

const indexes = new WeakMap<readonly SnapshotFile[], FileIndex>();

function parentOf(path: string) {
  const slash = path.lastIndexOf("/");
  return slash < 0 ? "." : path.slice(0, slash);
}

function basenameOf(path: string) {
  return path.slice(path.lastIndexOf("/") + 1);
}

function indexFor(files: readonly SnapshotFile[]): FileIndex {
  const cached = indexes.get(files);
  if (cached != null) return cached;
  const index: FileIndex = {
    byPath: new Map(),
    order: new Map(),
    filesIn: new Map(),
    subdirectories: new Map(),
  };
  const knownDirectories = new Set<string>(["."]);
  files.forEach((file, position) => {
    index.byPath.set(file.path, file);
    index.order.set(file, position);
    const directory = parentOf(file.path);
    let local = index.filesIn.get(directory);
    if (local == null) {
      local = [];
      index.filesIn.set(directory, local);
    }
    local.push(file);
    // Register every ancestor directory so subtree walks can reach it.
    let child = directory;
    while (!knownDirectories.has(child)) {
      knownDirectories.add(child);
      const parent = parentOf(child);
      let siblings = index.subdirectories.get(parent);
      if (siblings == null) {
        siblings = [];
        index.subdirectories.set(parent, siblings);
      }
      siblings.push(child);
      child = parent;
    }
  });
  indexes.set(files, index);
  return index;
}

/** The file at an exact root-relative path. */
export function fileAt(files: readonly SnapshotFile[], path: string) {
  return indexFor(files).byPath.get(path);
}

/** Join a project directory and a relative path ("." is the root). */
export function joinPath(directory: string, path: string) {
  return directory === "." ? path : `${directory}/${path}`;
}

/** Files directly inside `directory` (not in subdirectories). */
export function filesIn(files: readonly SnapshotFile[], directory: string) {
  return indexFor(files).filesIn.get(directory) ?? [];
}

/**
 * Files anywhere below `directory`, in snapshot order. Subtrees rooted at a
 * directory for which `stopAt` returns true are left out; `directory` itself
 * is never tested.
 */
export function filesUnder(
  files: readonly SnapshotFile[],
  directory: string,
  stopAt?: (directory: string) => boolean,
) {
  const index = indexFor(files);
  const found: SnapshotFile[] = [];
  const pending = [directory];
  while (pending.length > 0) {
    const current = pending.pop();
    if (current == null) break;
    if (current !== directory && stopAt?.(current)) continue;
    found.push(...(index.filesIn.get(current) ?? []));
    pending.push(...(index.subdirectories.get(current) ?? []));
  }
  return found.sort(
    (a, b) => (index.order.get(a) ?? 0) - (index.order.get(b) ?? 0),
  );
}

/** Whether `directory` directly contains a file with one of `basenames`. */
export function directoryContains(
  files: readonly SnapshotFile[],
  directory: string,
  basenames: ReadonlySet<string>,
) {
  return filesIn(files, directory).some((file) =>
    basenames.has(basenameOf(file.path)),
  );
}

/**
 * The first file named one of `basenames` in `directory` or its nearest
 * ancestor, checking basenames in order within each directory.
 */
export function nearestAncestorFile(
  files: readonly SnapshotFile[],
  directory: string,
  basenames: readonly string[],
) {
  let current = directory;
  for (;;) {
    for (const basename of basenames) {
      const file = fileAt(files, joinPath(current, basename));
      if (file != null) return file;
    }
    if (current === ".") return undefined;
    current = parentOf(current);
  }
}
