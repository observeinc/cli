import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createProjectSnapshot } from "../../snapshot";
import { detectApplications } from "../../detect";
import { applyGraph } from "../apply";
import { buildNpmArboristGraph } from "./npm-arborist";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

function fixture(files: Record<string, unknown>) {
  const root = mkdtempSync(join(tmpdir(), "obs-arborist-"));
  dirs.push(root);
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(
      join(root, path),
      typeof content === "string" ? content : JSON.stringify(content),
    );
  }
  return root;
}

describe("npm arborist graph", () => {
  test("follows workspace links into the workspace package's dependencies", async () => {
    const root = fixture({
      "package.json": {
        name: "mono",
        scripts: { start: "node index.js" },
        workspaces: ["packages/*"],
      },
      "packages/api/package.json": {
        name: "api",
        version: "1.0.0",
        dependencies: { express: "4.18.2" },
      },
      "package-lock.json": {
        name: "mono",
        lockfileVersion: 3,
        requires: true,
        packages: {
          "": { name: "mono", workspaces: ["packages/*"] },
          "node_modules/api": { resolved: "packages/api", link: true },
          "node_modules/express": { version: "4.18.2" },
          "packages/api": {
            name: "api",
            version: "1.0.0",
            dependencies: { express: "4.18.2" },
          },
        },
      },
    });
    const snapshot = createProjectSnapshot({ targetPath: root });
    const candidate = detectApplications(snapshot).candidates.find(
      (item) => item.path === ".",
    )!;
    const graph = await buildNpmArboristGraph({ candidate, snapshot });
    expect(graph?.completeness).toBe("resolved-graph");
    applyGraph({ candidate, graph: graph! });
    const express = candidate.dependencies.find(
      (dependency) => dependency.name === "express",
    );
    expect(express?.resolvedVersion).toBe("4.18.2");
    expect(express?.via).toEqual(["api"]);
    const api = candidate.dependencies.find((item) => item.name === "api");
    expect(api?.depth).toBe(1);
  });

  const workspace = {
    "package.json": { name: "mono", workspaces: ["apps/*"] },
    "apps/api/package.json": {
      name: "api",
      version: "1.0.0",
      scripts: { start: "node index.js" },
      dependencies: { express: "^4.18.0" },
    },
    "tools/report/package.json": {
      name: "report",
      scripts: { start: "node index.js" },
      dependencies: { express: "^4.18.0" },
    },
    "package-lock.json": {
      name: "mono",
      lockfileVersion: 3,
      requires: true,
      packages: {
        "": { name: "mono", workspaces: ["apps/*"] },
        "node_modules/api": { resolved: "apps/api", link: true },
        "node_modules/express": { version: "4.18.2" },
        "apps/api": {
          name: "api",
          version: "1.0.0",
          dependencies: { express: "^4.18.0" },
        },
      },
    },
  };

  test("a workspace member takes its graph from the root lockfile", async () => {
    const snapshot = createProjectSnapshot({ targetPath: fixture(workspace) });
    const candidate = detectApplications(snapshot).candidates.find(
      (item) => item.path === "apps/api",
    )!;
    const graph = await buildNpmArboristGraph({ candidate, snapshot });
    expect(graph?.completeness).toBe("resolved-graph");
    expect(graph?.provenance.path).toBe("package-lock.json");
    applyGraph({ candidate, graph: graph! });
    expect(
      candidate.dependencies.find((item) => item.name === "express")
        ?.resolvedVersion,
    ).toBe("4.18.2");
  });

  test("a directory the root lockfile does not install keeps its declared versions", async () => {
    const snapshot = createProjectSnapshot({ targetPath: fixture(workspace) });
    const candidate = detectApplications(snapshot).candidates.find(
      (item) => item.path === "tools/report",
    )!;
    expect(await buildNpmArboristGraph({ candidate, snapshot })).toBeNull();
    const express = candidate.dependencies.find(
      (item) => item.name === "express",
    );
    expect(express?.version).toBe("^4.18.0");
    expect(express?.resolvedVersion).toBeUndefined();
    expect(candidate.diagnostics).toEqual([]);
  });

  test("an app's own unreadable lockfile is reported once", async () => {
    const snapshot = createProjectSnapshot({
      targetPath: fixture({
        "package.json": {
          name: "app",
          scripts: { start: "node index.js" },
          dependencies: { express: "^4.18.0" },
        },
        "package-lock.json": "{ not json",
      }),
    });
    const [candidate] = detectApplications(snapshot).candidates;
    expect(
      await buildNpmArboristGraph({ candidate: candidate!, snapshot }),
    ).toBeNull();
    expect(
      candidate!.diagnostics.filter(
        (diagnostic) => diagnostic.code === "LOCKFILE_UNPARSEABLE",
      ),
    ).toHaveLength(1);
  });

  test("an app with its own yarn.lock ignores the npm workspace lockfile", async () => {
    const snapshot = createProjectSnapshot({
      targetPath: fixture({
        ...workspace,
        "package-lock.json": "{ not json",
        "apps/api/yarn.lock": [
          "# yarn lockfile v1",
          "",
          "express@^4.18.0:",
          '  version "4.18.2"',
        ].join("\n"),
      }),
    });
    const candidate = detectApplications(snapshot).candidates.find(
      (item) => item.path === "apps/api",
    )!;
    expect(await buildNpmArboristGraph({ candidate, snapshot })).toBeNull();
    expect(candidate.diagnostics).toEqual([]);
    expect(
      candidate.dependencies.find((item) => item.name === "express"),
    ).toMatchObject({ resolvedVersion: "4.18.2", sourceKind: "lockfile" });
  });

  test("an app's own package-lock.json is used even with a yarn.lock beside it", async () => {
    const snapshot = createProjectSnapshot({
      targetPath: fixture({
        "package.json": {
          name: "app",
          scripts: { start: "node index.js" },
          dependencies: { express: "^4.18.0" },
        },
        "package-lock.json": {
          name: "app",
          lockfileVersion: 3,
          requires: true,
          packages: {
            "": { name: "app", dependencies: { express: "^4.18.0" } },
            "node_modules/express": { version: "4.18.2" },
          },
        },
        "yarn.lock": [
          "# yarn lockfile v1",
          "",
          "express@^4.18.0:",
          '  version "4.18.2"',
        ].join("\n"),
      }),
    });
    const [candidate] = detectApplications(snapshot).candidates;
    const graph = await buildNpmArboristGraph({
      candidate: candidate!,
      snapshot,
    });
    expect(graph?.completeness).toBe("resolved-graph");
    expect(graph?.provenance.path).toBe("package-lock.json");
  });

  test("an unreadable workspace lockfile is reported, not skipped silently", async () => {
    const snapshot = createProjectSnapshot({
      targetPath: fixture({ ...workspace, "package-lock.json": "{ not json" }),
    });
    const candidate = detectApplications(snapshot).candidates.find(
      (item) => item.path === "apps/api",
    )!;
    expect(await buildNpmArboristGraph({ candidate, snapshot })).toBeNull();
    expect(
      candidate.diagnostics.find(
        (diagnostic) => diagnostic.code === "LOCKFILE_UNPARSEABLE",
      ),
    ).toMatchObject({ severity: "warning", path: "package-lock.json" });
  });
});
