import { describe, expect, test } from "bun:test";
import { fileAt, filesIn, filesUnder, nearestAncestorFile } from "./file-index";
import type { SnapshotFile } from "./snapshot";

const files: SnapshotFile[] = [
  "go.mod",
  "main.go",
  "svc/a/go.mod",
  "svc/a/main.go",
  "svc/b/cmd/main.go",
  "svc/b/lib.go",
  "uv.lock",
].map((path) => ({ path, size: 0 }));

const paths = (list: SnapshotFile[]) => list.map((file) => file.path);

describe("file index", () => {
  test("looks up exact paths and direct children", () => {
    expect(fileAt(files, "svc/a/main.go")?.path).toBe("svc/a/main.go");
    expect(fileAt(files, "svc/a")).toBeUndefined();
    expect(paths(filesIn(files, "."))).toEqual([
      "go.mod",
      "main.go",
      "uv.lock",
    ]);
    expect(paths(filesIn(files, "svc"))).toEqual([]);
  });

  test("walks a subtree in snapshot order, pruning at stopAt", () => {
    expect(paths(filesUnder(files, "svc"))).toEqual([
      "svc/a/go.mod",
      "svc/a/main.go",
      "svc/b/cmd/main.go",
      "svc/b/lib.go",
    ]);
    expect(
      paths(filesUnder(files, ".", (directory) => directory === "svc/a")),
    ).toEqual([
      "go.mod",
      "main.go",
      "svc/b/cmd/main.go",
      "svc/b/lib.go",
      "uv.lock",
    ]);
  });

  test("finds the nearest ancestor file", () => {
    expect(nearestAncestorFile(files, "svc/b/cmd", ["uv.lock"])?.path).toBe(
      "uv.lock",
    );
    expect(nearestAncestorFile(files, "svc/a", ["go.mod"])?.path).toBe(
      "svc/a/go.mod",
    );
    expect(
      nearestAncestorFile(files, "svc", ["pnpm-lock.yaml"]),
    ).toBeUndefined();
  });
});
