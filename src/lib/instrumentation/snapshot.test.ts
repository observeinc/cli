import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createProjectSnapshot } from "./snapshot";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

function fixture(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), "obs-snapshot-"));
  dirs.push(root);
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

function paths(root: string, exclude?: string[]) {
  return createProjectSnapshot({ targetPath: root, exclude }).files.map(
    (file) => file.path,
  );
}

describe("createProjectSnapshot", () => {
  test("skips hidden directories but keeps hidden files", () => {
    const root = fixture({
      "package.json": "{}",
      ".nvmrc": "22\n",
      ".claude/worktrees/copy/package.json": "{}",
      ".github/workflows/ci.yml": "on: push\n",
    });
    expect(paths(root)).toEqual([".nvmrc", "package.json"]);
  });

  test("excludes directories relative to the project", () => {
    const root = fixture({
      "app/package.json": "{}",
      "legacy/package.json": "{}",
      "tools/gen/package.json": "{}",
      "tools/keep/package.json": "{}",
    });
    expect(paths(root, ["legacy", "tools/gen/"])).toEqual([
      "app/package.json",
      "tools/keep/package.json",
    ]);
  });

  test("rejects an excluded path outside the project", () => {
    const root = fixture({ "package.json": "{}" });
    expect(() => paths(root, ["../elsewhere"])).toThrow("outside the project");
  });

  test("reads metadata eagerly and source files on first access", () => {
    const root = fixture({
      "package.json": '{"name":"app"}',
      "src/index.js": "console.log(1);\n",
    });
    const snapshot = createProjectSnapshot({ targetPath: root });
    const manifest = snapshot.files.find((f) => f.path === "package.json");
    const source = snapshot.files.find((f) => f.path === "src/index.js");
    expect(manifest?.content).toBe('{"name":"app"}');
    // Changing the file before first access proves the read is deferred.
    writeFileSync(join(root, "src/index.js"), "console.log(2);\n");
    expect(source?.content).toBe("console.log(2);\n");
  });

  test("source files over the text limit or binary have no content", () => {
    const root = fixture({
      "package.json": "{}",
      "big.js": "x".repeat(64),
      "blob.js": "a\u0000b",
    });
    const snapshot = createProjectSnapshot({
      targetPath: root,
      maxTextBytes: 16,
    });
    for (const path of ["big.js", "blob.js"])
      expect(
        snapshot.files.find((file) => file.path === path)?.content,
      ).toBeUndefined();
  });

  test("reports an actionable scan-limit diagnostic", () => {
    const root = fixture({ "a.txt": "", "b.txt": "", "c.txt": "" });
    const snapshot = createProjectSnapshot({ targetPath: root, maxFiles: 2 });
    expect(snapshot.completeness.limitReached).toBe(true);
    expect(snapshot.diagnostics[0]?.message).toContain("--exclude");
  });
});
