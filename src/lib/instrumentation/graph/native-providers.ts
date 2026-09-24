import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { z } from "zod";
import type { CandidateApplication, Diagnostic } from "../types";
import type { ProjectSnapshot } from "../snapshot";
import {
  packageId,
  type DependencyGraph,
  type PackageNode,
  type DependencyEdge,
} from "./types";
import { runNativeResolver, type NativeRunResult } from "./native-runner";

/**
 * Outcome of `--resolve` for one candidate: a graph, or the reason there is
 * none. Callers surface the reason instead of silently falling back to the
 * declared dependencies.
 */
export type NativeResolution =
  | { graph: DependencyGraph; diagnostic?: undefined }
  | { graph: null; diagnostic: Diagnostic };

/** Pinned so `-DoutputType=json` (added in 3.7.0) is always available. */
export const MAVEN_DEPENDENCY_PLUGIN =
  "org.apache.maven.plugins:maven-dependency-plugin:3.8.1";

function failure(
  tool: string,
  message: string,
  severity: Diagnostic["severity"] = "warning",
): NativeResolution {
  return {
    graph: null,
    diagnostic: {
      code: severity === "info" ? "RESOLVE_UNSUPPORTED" : "RESOLVE_FAILED",
      severity,
      message: `--resolve: ${tool} ${message}; assessed declared dependencies only`,
    },
  };
}

/** Why a resolver run produced nothing usable, in one line. */
function runFailure(tool: string, result: NativeRunResult, hint: string) {
  if (result.error != null)
    return failure(tool, `could not run (${result.error})`);
  const detail = result.stderr
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  return failure(
    tool,
    `exited ${String(result.status)}${detail == null ? "" : `: ${detail.slice(0, 200)}`}. ${hint}`,
  );
}

function resolved(graph: DependencyGraph | null, tool: string) {
  return graph == null
    ? failure(tool, "output could not be parsed as a dependency graph")
    : { graph };
}

const cargoMetadata = z.object({
  packages: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      version: z.string(),
      source: z.string().nullish(),
      manifest_path: z.string(),
    }),
  ),
  workspace_members: z.array(z.string()),
  resolve: z
    .object({
      root: z.string().nullable(),
      nodes: z.array(
        z.object({
          id: z.string(),
          deps: z.array(
            z.object({
              pkg: z.string(),
              dep_kinds: z.array(
                z.object({
                  kind: z.string().nullable(),
                  target: z.string().nullish(),
                }),
              ),
            }),
          ),
        }),
      ),
    })
    .nullable(),
});

const goPackage = z.object({
  ImportPath: z.string(),
  Name: z.string().optional(),
  Imports: z.array(z.string()).default([]),
  Module: z
    .object({
      Path: z.string(),
      Version: z.string().optional(),
      Main: z.boolean().optional(),
    })
    .optional(),
});

interface MavenNode {
  groupId: string;
  artifactId: string;
  version: string;
  scope?: string;
  children: MavenNode[];
}

const mavenNode: z.ZodType<MavenNode> = z.lazy(() =>
  z.object({
    groupId: z.string(),
    artifactId: z.string(),
    version: z.string(),
    scope: z.string().optional(),
    children: z.array(mavenNode).default([]),
  }),
);

export function resolveNative({
  candidate,
  snapshot,
  run = runNativeResolver,
}: {
  candidate: CandidateApplication;
  snapshot: ProjectSnapshot;
  run?: typeof runNativeResolver;
}): NativeResolution | null {
  switch (candidate.language.id) {
    case "rust":
      return cargoGraph(candidate, snapshot, run);
    case "go":
      return goGraph(candidate, snapshot, run);
    case "java":
      return mavenGraph(candidate, snapshot, run);
    default:
      return null;
  }
}

function cargoGraph(
  candidate: CandidateApplication,
  snapshot: ProjectSnapshot,
  run: typeof runNativeResolver,
) {
  const cwd = join(snapshot.root, candidate.path === "." ? "" : candidate.path);
  const result = run({
    executable: "cargo",
    args: ["metadata", "--locked", "--offline", "--format-version", "1"],
    cwd,
  });
  if (result.status !== 0)
    return runFailure(
      "cargo metadata",
      result,
      "Commit Cargo.lock and fetch dependencies (cargo fetch) so offline resolution succeeds",
    );
  const parsed = cargoMetadata.safeParse(parseJson(result.stdout));
  if (!parsed.success) return resolved(null, "cargo metadata");
  const metadata = parsed.data;
  const nodes = new Map<string, PackageNode>();
  const idMap = new Map<string, string>();
  for (const pkg of metadata.packages) {
    const id = packageId({
      ecosystem: "cargo",
      name: pkg.name,
      version: pkg.version,
      source: {
        kind: pkg.source ? "registry" : "workspace",
        location: pkg.source ?? pkg.manifest_path,
      },
    });
    idMap.set(pkg.id, id);
    nodes.set(id, {
      id,
      name: pkg.name,
      version: pkg.version,
      purl: `pkg:cargo/${pkg.name}@${pkg.version}`,
      source: {
        kind: pkg.source ? "registry" : "workspace",
        location: pkg.source ?? pkg.manifest_path,
      },
      workspace: !pkg.source,
    });
  }
  const edges: DependencyEdge[] = (metadata.resolve?.nodes ?? []).flatMap(
    (node) =>
      node.deps.flatMap((dep) =>
        dep.dep_kinds.flatMap((kind) => {
          const from = idMap.get(node.id);
          const to = idMap.get(dep.pkg);
          return from && to
            ? [
                {
                  from,
                  to,
                  kind:
                    kind.kind === "dev"
                      ? ("development" as const)
                      : kind.kind === "build"
                        ? ("build" as const)
                        : ("runtime" as const),
                  optional: false,
                  condition: kind.target ?? undefined,
                },
              ]
            : [];
        }),
      ),
  );
  const rootId = metadata.resolve?.root ?? metadata.workspace_members[0];
  const root = rootId == null ? undefined : idMap.get(rootId);
  return resolved(
    root
      ? graph("cargo-metadata", "Cargo.toml", root, nodes, edges, "cargo")
      : null,
    "cargo metadata",
  );
}

function goGraph(
  candidate: CandidateApplication,
  snapshot: ProjectSnapshot,
  run: typeof runNativeResolver,
) {
  const cwd = join(snapshot.root, candidate.path === "." ? "" : candidate.path);
  const result = run({
    executable: "go",
    args: ["list", "-mod=readonly", "-deps", "-json", "."],
    cwd,
  });
  if (result.status !== 0)
    return runFailure(
      "go list",
      result,
      "Download modules into the module cache (go mod download) so offline resolution succeeds",
    );
  const parsed = z.array(goPackage).safeParse(parseJsonStream(result.stdout));
  if (!parsed.success) return resolved(null, "go list");
  const packages = parsed.data;
  const nodes = new Map<string, PackageNode>();
  const ids = new Map<string, string>();
  for (const pkg of packages) {
    const module = pkg.Module;
    const name = module?.Path ?? pkg.ImportPath;
    const version = module?.Version;
    const id = packageId({
      ecosystem: "golang",
      name,
      version,
      source: { kind: module?.Main ? "workspace" : "registry" },
    });
    ids.set(pkg.ImportPath, id);
    nodes.set(id, {
      id,
      name,
      version,
      purl: version ? `pkg:golang/${name}@${version}` : undefined,
      source: { kind: module?.Main ? "workspace" : "registry" },
      workspace: Boolean(module?.Main),
    });
  }
  const edges: DependencyEdge[] = packages.flatMap((pkg) =>
    pkg.Imports.flatMap((name) => {
      const from = ids.get(pkg.ImportPath);
      const to = ids.get(name);
      return from != null && to != null
        ? [{ from, to, kind: "runtime" as const, optional: false }]
        : [];
    }),
  );
  const main = packages.find((pkg) => pkg.Name === "main");
  const root = main == null ? undefined : ids.get(main.ImportPath);
  return resolved(
    root ? graph("go-list", "go.mod", root, nodes, edges, "go") : null,
    "go list",
  );
}

function mavenGraph(
  candidate: CandidateApplication,
  snapshot: ProjectSnapshot,
  run: typeof runNativeResolver,
) {
  const manifest = candidate.evidence.find((item) =>
    item.path.endsWith("pom.xml"),
  );
  if (manifest == null)
    return failure(
      "resolution",
      "supports Maven projects only, not Gradle",
      "info",
    );
  const cwd = dirname(join(snapshot.root, manifest.path));
  // The tree goes to a file outside the project: stdout mixes in Maven's log,
  // and /dev/stdout does not exist on Windows. Appending keeps one tree per
  // reactor module instead of letting each module overwrite the last.
  const outputDirectory = mkdtempSync(join(tmpdir(), "observe-mvn-tree-"));
  const outputFile = join(outputDirectory, "tree.json");
  let output: string;
  try {
    const result = run({
      executable: "mvn",
      args: [
        "--offline",
        "--batch-mode",
        "--quiet",
        `${MAVEN_DEPENDENCY_PLUGIN}:tree`,
        "-DoutputType=json",
        `-DoutputFile=${outputFile}`,
        "-DappendOutput=true",
      ],
      cwd,
    });
    if (result.status !== 0)
      return runFailure(
        "mvn dependency:tree",
        result,
        `Offline resolution needs every dependency and ${MAVEN_DEPENDENCY_PLUGIN} in the local repository (run the same command once without --offline)`,
      );
    try {
      output = readFileSync(outputFile, "utf8");
    } catch {
      return failure("mvn dependency:tree", "wrote no dependency tree");
    }
  } finally {
    rmSync(outputDirectory, { recursive: true, force: true });
  }
  const trees = (parseJsonStream(output) ?? []).flatMap((tree) => {
    const parsed = mavenNode.safeParse(tree);
    return parsed.success ? [parsed.data] : [];
  });
  const selected =
    trees.find((tree) => tree.artifactId === candidate.name) ?? trees[0];
  if (selected == null) return resolved(null, "mvn dependency:tree");
  const rootNode = selected;
  const nodes = new Map<string, PackageNode>();
  const edges: DependencyEdge[] = [];
  const visit = (raw: MavenNode, parent?: string) => {
    const name = `${raw.groupId}:${raw.artifactId}`;
    const version = raw.version;
    const id = packageId({
      ecosystem: "maven",
      name,
      version,
      source: { kind: parent ? "registry" : "workspace" },
    });
    nodes.set(id, {
      id,
      name: raw.artifactId,
      version,
      purl: `pkg:maven/${raw.groupId}/${raw.artifactId}@${version}`,
      source: { kind: parent ? "registry" : "workspace" },
      workspace: !parent,
    });
    if (parent)
      edges.push({
        from: parent,
        to: id,
        kind:
          raw.scope === "test"
            ? "test"
            : raw.scope === "provided"
              ? "build"
              : "runtime",
        optional: false,
      });
    for (const child of raw.children) visit(child, id);
    return id;
  };
  const root = visit(rootNode);
  return resolved(
    graph("maven-dependency-tree", manifest.path, root, nodes, edges, "mvn"),
    "mvn dependency:tree",
  );
}

function graph(
  provider: string,
  path: string,
  root: string,
  nodes: Map<string, PackageNode>,
  edges: DependencyEdge[],
  tool: string,
): DependencyGraph {
  return {
    roots: [root],
    nodes,
    edges,
    completeness: "resolved-graph",
    provenance: { provider, path, tool },
    diagnostics: [],
  };
}

function parseJsonStream(input: string) {
  const results: unknown[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let index = 0; index < input.length; index++) {
    const character = input[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (depth === 0 && character !== "{" && !/\s/.test(character ?? ""))
      return null;
    if (character === '"') inString = true;
    else if (character === "{") {
      if (depth++ === 0) start = index;
    } else if (character === "}" && --depth === 0 && start >= 0) {
      results.push(parseJson(input.slice(start, index + 1)));
      start = -1;
    }
  }
  return depth === 0 && !inString ? results : null;
}

function parseJson(input: string): unknown {
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return null;
  }
}
