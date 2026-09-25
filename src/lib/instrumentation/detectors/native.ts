import { posix } from "node:path";
import { parse as parseToml } from "smol-toml";
import type { ProjectSnapshot } from "../snapshot";
import type { DetectedDependency } from "../types";
import type { ApplicationDiscoveryProvider } from "../discovery/types";
import {
  createCandidate,
  findOwnedProjectFiles,
  projectDirectory,
} from "./common";
import { fileAt } from "../file-index";

export const nativeApplicationProvider: ApplicationDiscoveryProvider = {
  id: "native-static",
  discover(snapshot) {
    return {
      candidates: [
        ...detectGo(snapshot),
        ...detectRust(snapshot),
        ...detectCpp(snapshot),
        ...detectMarkerRuntimes(snapshot),
      ],
      diagnostics: cmakeDiagnostics(snapshot),
    };
  },
};

export function detectNative(snapshot: ProjectSnapshot) {
  return nativeApplicationProvider.discover(snapshot).candidates;
}

function detectGo(snapshot: ProjectSnapshot) {
  return snapshot.files
    .filter((file) => posix.basename(file.path) === "go.mod")
    .flatMap((manifest) => {
      const directory = projectDirectory(manifest.path);
      const content = manifest.content ?? "";
      const version = /^go\s+(\d+(?:\.\d+){1,2})/m.exec(content)?.[1];
      const modulePath = /^module\s+(\S+)/m.exec(content)?.[1];
      const dependencies = goRequirements(content);
      const mains = findOwnedProjectFiles(snapshot.files, directory, [
        "go.mod",
      ]).filter(
        (file) =>
          !/(^|\/)(?:testdata|fixtures?|examples?|vendor|third_party|node_modules)(\/|$)/i.test(
            file.path,
          ) &&
          file.path.endsWith(".go") &&
          !file.path.endsWith("_test.go") &&
          /^\s*package\s+main\b/m.test(file.content ?? "") &&
          !isGeneratedGoFile(file.content ?? ""),
      );
      const mainDirectories = [
        ...new Set(mains.map((file) => posix.dirname(file.path))),
      ];
      // A giant module can contain many command packages. Each command is an
      // application; the module root is not an application unless it has main.
      const runnableDirectories = mainDirectories.filter((mainDirectory) => {
        const relative =
          mainDirectory === directory
            ? "."
            : directory === "."
              ? mainDirectory
              : mainDirectory.slice(directory.length + 1);
        return (
          relative === "." ||
          relative.startsWith("cmd/") ||
          relative.includes("/cmd/") ||
          /(^|\/)(?:command|commands|cli)(\/|$)/.test(relative)
        );
      });
      return runnableDirectories.map((mainDirectory) =>
        createCandidate({
          directory: mainDirectory,
          name:
            mainDirectory === "."
              ? posix.basename(modulePath ?? snapshot.root)
              : posix.basename(mainDirectory),
          language: "go",
          runtime: "go",
          version,
          entrypoints: mains
            .filter((file) => posix.dirname(file.path) === mainDirectory)
            .map((file) => ({ path: file.path })),
          dependencies,
          evidence: [{ kind: "manifest", path: manifest.path }],
          discovery: {
            completeness: "resolved",
            provenance: {
              provider: "go-module-static",
              path: manifest.path,
              target: mainDirectory,
              rule: "package main",
            },
          },
        }),
      );
    });
}

/**
 * Go marks machine-written files with a `// Code generated ... DO NOT EDIT.`
 * line before the package clause. A module whose only `main`-package files are
 * generated (for example the OpenTelemetry Collector Builder's `ocb-build`
 * output) is a build product, not an application the project instruments, so it
 * yields no candidate. See https://pkg.go.dev/cmd/go#hdr-Generate_Go_files.
 */
function isGeneratedGoFile(content: string): boolean {
  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (/^\/\/ Code generated .* DO NOT EDIT\.$/.test(line)) return true;
    if (/^package\s/.test(line)) return false;
  }
  return false;
}

/**
 * Direct module requirements from go.mod, as single `require` lines or
 * `require ( ... )` blocks. `// indirect` requirements are skipped: Go
 * instrumentation is wired in by hand around the application's own calls, so
 * only modules the application imports directly can be instrumented.
 * Standard-library packages never appear in go.mod and are not reported.
 */
function goRequirements(content: string): DetectedDependency[] {
  const dependencies: DetectedDependency[] = [];
  let inBlock = false;
  for (const raw of content.split("\n")) {
    const indirect = /\/\/\s*indirect\b/.test(raw);
    const line = raw.replace(/\/\/.*$/, "").trim();
    if (inBlock && line === ")") {
      inBlock = false;
      continue;
    }
    if (/^require\s*\($/.test(line)) {
      inBlock = true;
      continue;
    }
    const requirement = inBlock ? line : /^require\s+(.+)$/.exec(line)?.[1];
    const match =
      requirement == null ? null : /^(\S+)\s+(\S+)$/.exec(requirement);
    if (match?.[1] == null || match[2] == null || indirect) continue;
    const [, name, version] = match;
    dependencies.push({
      name,
      version,
      scope: "runtime",
      optional: false,
      sourceKind: "manifest",
      purl: `pkg:golang/${name}@${version}`,
    });
  }
  return dependencies;
}

function detectRust(snapshot: ProjectSnapshot) {
  return snapshot.files
    .filter((file) => posix.basename(file.path) === "Cargo.toml")
    .flatMap((manifest) => {
      let parsed: Record<string, unknown>;
      try {
        parsed = parseToml(manifest.content ?? "");
      } catch {
        return [];
      }
      const pkg = asRecord(parsed.package);
      if (pkg == null) return [];
      const directory = projectDirectory(manifest.path);
      const mainPath =
        directory === "." ? "src/main.rs" : `${directory}/src/main.rs`;
      const hasMain = fileAt(snapshot.files, mainPath) != null;
      const bins = Array.isArray(parsed.bin) ? parsed.bin : [];
      if (!hasMain && bins.length === 0) return [];
      return [
        createCandidate({
          directory,
          name:
            typeof pkg.name === "string" ? pkg.name : posix.basename(directory),
          language: "rust",
          runtime: "rust",
          version:
            typeof pkg["rust-version"] === "string"
              ? pkg["rust-version"]
              : undefined,
          entrypoints: hasMain ? [{ path: mainPath }] : [],
          dependencies: cargoDependencies(parsed),
          evidence: [{ kind: "manifest", path: manifest.path }],
          discovery: {
            completeness: "resolved",
            provenance: {
              provider: "cargo-static",
              path: manifest.path,
              target: typeof pkg.name === "string" ? pkg.name : directory,
              rule: hasMain ? "src/main.rs" : "[[bin]]",
            },
          },
        }),
      ];
    });
}

function cargoDependencies(parsed: Record<string, unknown>) {
  const result: DetectedDependency[] = [];
  for (const [section, scope] of [
    ["dependencies", "runtime"],
    ["dev-dependencies", "test"],
    ["build-dependencies", "build"],
  ] as const)
    for (const [name, raw] of Object.entries(asRecord(parsed[section]) ?? {})) {
      const table = asRecord(raw);
      const version = typeof raw === "string" ? raw : table?.version;
      result.push({
        name,
        version: typeof version === "string" ? version : undefined,
        scope,
        sourceKind: "manifest",
        purl: `pkg:cargo/${name}`,
      });
    }
  return result;
}

function detectCpp(snapshot: ProjectSnapshot) {
  return detectCmakeBinaries(snapshot);
}

function detectCmakeBinaries(snapshot: ProjectSnapshot) {
  const manifests = snapshot.files.filter(
    (file) => posix.basename(file.path) === "CMakeLists.txt",
  );
  const roots = manifests.filter((manifest) => {
    const directory = projectDirectory(manifest.path);
    return !manifests.some((parent) => {
      const parentDirectory = projectDirectory(parent.path);
      return (
        parentDirectory !== directory &&
        (parentDirectory === "." || directory.startsWith(`${parentDirectory}/`))
      );
    });
  });
  return roots.flatMap((manifest) => {
    const directory = projectDirectory(manifest.path);
    const content = snapshot.files
      .filter((file) => {
        const path = projectDirectory(file.path);
        return (
          posix.basename(file.path) === "CMakeLists.txt" &&
          (path === directory || path.startsWith(`${directory}/`))
        );
      })
      .map((file) => file.content ?? "")
      .join("\n");
    return [...content.matchAll(/add_executable\s*\(\s*([^\s)]+)/gi)]
      .map((match) => match[1]?.replace(/^['"]|['"]$/g, ""))
      .filter(
        (name): name is string =>
          name != null &&
          name.length > 0 &&
          !name.includes("${") &&
          !name.includes("$<"),
      )
      .map((name) =>
        createCandidate({
          directory,
          idSuffix: name,
          name,
          language: "cpp",
          runtime: "cpp",
          evidence: [{ kind: "manifest", path: manifest.path }],
          discovery: {
            completeness: "partial",
            provenance: {
              provider: "cmake-static",
              path: manifest.path,
              target: name,
              rule: "add_executable",
            },
          },
        }),
      );
  });
}

function cmakeDiagnostics(snapshot: ProjectSnapshot) {
  return snapshot.files.flatMap((file) => {
    if (posix.basename(file.path) !== "CMakeLists.txt") return [];
    return [
      ...(file.content ?? "").matchAll(/add_executable\s*\(\s*([^\s)]+)/gi),
    ].flatMap((match) => {
      const target = match[1]?.replace(/^['"]|['"]$/g, "");
      return target == null ||
        (!target.includes("${") && !target.includes("$<"))
        ? []
        : [
            {
              code: "DYNAMIC_TARGET_NAME" as const,
              severity: "warning" as const,
              message:
                "CMake add_executable has a computed target name and cannot be identified statically",
              path: file.path,
            },
          ];
    });
  });
}

function detectMarkerRuntimes(snapshot: ProjectSnapshot) {
  const markers = [
    { basename: "mix.exs", language: "erlang" as const, runtime: "beam" },
    { basename: "rebar.config", language: "erlang" as const, runtime: "beam" },
    { basename: "cpanfile", language: "perl" as const, runtime: "perl" },
  ];
  return snapshot.files.flatMap((file) => {
    const marker = markers.find(
      (item) => item.basename === posix.basename(file.path),
    );
    if (marker == null) return [];
    const directory = projectDirectory(file.path);
    return [
      createCandidate({
        directory,
        name: posix.basename(directory === "." ? snapshot.root : directory),
        language: marker.language,
        runtime: marker.runtime,
        evidence: [{ kind: "manifest", path: file.path }],
        discovery: {
          completeness: "inventory-only",
          provenance: {
            provider: "runtime-marker-static",
            path: file.path,
          },
        },
      }),
    ];
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
