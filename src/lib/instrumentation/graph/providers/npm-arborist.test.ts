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
});
