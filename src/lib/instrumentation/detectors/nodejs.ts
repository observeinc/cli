import { posix } from "node:path";
import type { ProjectSnapshot } from "../snapshot";
import {
  createCandidate,
  detectLockfiles,
  projectDirectory,
  safeJson,
  scopedDependencies,
} from "./common";

const FRAMEWORKS = [
  "express",
  "@nestjs/core",
  "fastify",
  "koa",
  "@hapi/hapi",
  "restify",
];

export function detectNodejs(snapshot: ProjectSnapshot) {
  return snapshot.files
    .filter((file) => posix.basename(file.path) === "package.json")
    .flatMap((manifest) => {
      const json = safeJson(manifest.content);
      if (!json) return [];
      const directory = projectDirectory(manifest.path);
      const dependencies = [
        ...scopedDependencies({
          entries:
            typeof json.dependencies === "object" ? json.dependencies : {},
          scope: "runtime",
        }),
        ...scopedDependencies({
          entries:
            typeof json.devDependencies === "object"
              ? json.devDependencies
              : {},
          scope: "development",
        }),
        ...scopedDependencies({
          entries:
            typeof json.peerDependencies === "object"
              ? json.peerDependencies
              : {},
          scope: "peer",
        }),
        ...scopedDependencies({
          entries:
            typeof json.optionalDependencies === "object"
              ? json.optionalDependencies
              : {},
          scope: "optional",
          optional: true,
        }),
      ];
      const dependencyMap = new Map(
        dependencies.map((dependency) => [dependency.name, dependency.version]),
      );
      const scripts =
        typeof json.scripts === "object" && json.scripts
          ? (json.scripts as Record<string, unknown>)
          : {};
      const start =
        typeof scripts.start === "string" ? scripts.start : undefined;
      const serve =
        typeof scripts.serve === "string" ? scripts.serve : undefined;
      const main = typeof json.main === "string" ? json.main : undefined;
      const bin =
        typeof json.bin === "string" ||
        (json.bin != null && typeof json.bin === "object");
      // A framework dependency does not make a package an application. Shared
      // libraries often depend on Express/Fastify types. Require an executable
      // contract from scripts, bin, or a main entry point.
      if (!start && !serve && !main && !bin) return [];
      const lockfiles = detectLockfiles({
        files: snapshot.files,
        directory,
        mapping: {
          "package-lock.json": "npm",
          "npm-shrinkwrap.json": "npm",
          "pnpm-lock.yaml": "pnpm",
          "yarn.lock": "yarn",
          "bun.lock": "bun",
          "bun.lockb": "bun",
        },
      });
      const packageManagerField =
        typeof json.packageManager === "string"
          ? json.packageManager.split("@")[0]
          : undefined;
      const declaredManager = ["npm", "pnpm", "yarn", "bun"].includes(
        packageManagerField ?? "",
      )
        ? (packageManagerField as "npm" | "pnpm" | "yarn" | "bun")
        : undefined;
      const selectedManager = declaredManager ?? lockfiles[0]?.manager ?? "npm";
      const candidate = createCandidate({
        directory,
        name:
          typeof json.name === "string"
            ? json.name
            : posix.basename(directory === "." ? snapshot.root : directory),
        language: "nodejs",
        runtime: "node",
        version:
          typeof json.engines === "object" &&
          json.engines &&
          typeof (json.engines as Record<string, unknown>).node === "string"
            ? String((json.engines as Record<string, unknown>).node)
            : undefined,
        packageManager: {
          id: selectedManager,
          lockfile: lockfiles.find((item) => item.manager === selectedManager)
            ?.path,
          source: declaredManager
            ? "manifest"
            : lockfiles.length
              ? "lockfile"
              : "default",
        },
        lockfiles: lockfiles.map((item) => item.path),
        frameworks: FRAMEWORKS.filter((name) => dependencyMap.has(name)).map(
          (name) => ({ id: name, version: dependencyMap.get(name) }),
        ),
        entrypoints: main
          ? [{ path: main, command: start ?? serve }]
          : (start ?? serve)
            ? [{ path: "package.json", command: start ?? serve }]
            : [],
        dependencies,
        evidence: [{ kind: "manifest", path: manifest.path }],
      });
      candidate.runtime.moduleSystem =
        json.type === "module" ? "esm" : "commonjs";
      if (lockfiles.length > 1)
        candidate.diagnostics.push({
          code: "MULTIPLE_LOCKFILES",
          severity: "error",
          message: "Multiple Node.js lockfiles found",
          path: directory,
        });
      if (
        declaredManager &&
        lockfiles.length > 0 &&
        !lockfiles.some((item) => item.manager === declaredManager)
      )
        candidate.diagnostics.push({
          code: "PACKAGE_MANAGER_CONFLICT",
          severity: "error",
          message: `packageManager declares ${declaredManager}, but its lockfile is absent`,
          path: manifest.path,
        });
      return [candidate];
    });
}
