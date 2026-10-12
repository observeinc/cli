/**
 * Detect observe CLI commands a PR adds, changes or removes.
 *
 * Builds the command tree statically from the Stricli route maps
 * (`defineRoutes({ routes: { ... } })`) at the base and head commits, so it
 * needs no codegen or secrets. Advisory only: CI posts the result and never
 * fails on it.
 *
 * Tags: `contract` when a command's flags, positional args or docs changed,
 * or the command was added or removed; `impl` otherwise; `indirect` for
 * shared code (src/lib, src/rest) that every command may use.
 *
 * Usage:
 *   bun run scripts/surface-detect.ts [--base REV] [--head REV] [--json FILE] [--markdown]
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";

export interface Surface {
  kind: "cli";
  name: string;
  change: "added" | "modified" | "removed";
  tags: string[];
  files: string[];
}

const ROOT_FILE = "src/app.ts";
// Route maps are built with the repo wrapper or Stricli directly.
const ROUTES_CALL = "(?:defineRoutes|buildRouteMap)";
const SHARED_PREFIXES = ["src/lib/", "src/rest/", "src/gql/"];

function git(args: string[], cwd?: string): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function show(rev: string, file: string, cwd?: string): string | null {
  try {
    return git(["show", `${rev}:${file}`], cwd);
  } catch {
    return null;
  }
}

/** Identifier -> resolved repo path for relative imports in `file`. */
export function importMap(
  source: string,
  file: string,
  exists: (p: string) => boolean,
): Map<string, string> {
  const out = new Map<string, string>();
  for (const [, names = "", rawSpec = ""] of source.matchAll(
    /import\s*\{([^}]*)\}\s*from\s*["'](\.[^"']+)["']/g,
  )) {
    const spec = rawSpec.replace(/\.js$/, "");
    const base = path.posix.normalize(
      path.posix.join(path.posix.dirname(file), spec),
    );
    const target = [`${base}.ts`, `${base}/index.ts`, base].find(exists);
    if (!target) continue;
    for (const raw of names.split(",")) {
      const name = (
        raw
          .replace(/^\s*type\s+/, "")
          .split(/\s+as\s+/)
          .pop() ?? ""
      ).trim();
      if (name) out.set(name, target);
    }
  }
  return out;
}

/** `key: ident` pairs inside the `routes: { ... }` block of a defineRoutes call. */
export function routeEntries(
  source: string,
  routesIdent?: string,
): [string, string][] {
  let start = -1;
  if (routesIdent) {
    const decl = source.search(
      new RegExp(`\\b${routesIdent}\\s*=\\s*${ROUTES_CALL}\\s*\\(`),
    );
    if (decl >= 0) start = source.indexOf("routes:", decl);
  } else {
    start = source.indexOf(
      "routes:",
      source.search(new RegExp(`${ROUTES_CALL}\\s*\\(`)),
    );
  }
  if (start < 0) return [];
  const open = source.indexOf("{", start);
  const block = source
    .slice(open + 1, matchBrace(source, open))
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const entries: [string, string][] = [];
  for (const [, key = "", ident = ""] of block.matchAll(
    /(?:^|[,\s])["']?([\w-]+)["']?\s*:\s*(\w+)/g,
  )) {
    entries.push([key, ident]);
  }
  return entries;
}

function matchBrace(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return i;
  }
  return text.length;
}

/** Full command path ("monitor mute list") -> defining file, at `rev`. */
export function commandTree(rev: string, cwd?: string): Map<string, string> {
  const files = new Set(
    git(["ls-tree", "-r", "--name-only", rev, "--", "src"], cwd).split("\n"),
  );
  const exists = (p: string) => files.has(p);
  const tree = new Map<string, string>();
  const walk = (
    file: string,
    ident: string | undefined,
    prefix: string[],
    depth: number,
  ) => {
    const source = show(rev, file, cwd);
    if (!source || depth > 6) return;
    const imports = importMap(source, file, exists);
    for (const [key, target] of routeEntries(source, ident)) {
      const childFile = imports.get(target) ?? file;
      const childSource =
        childFile === file ? source : show(rev, childFile, cwd);
      const isRoutes = childSource
        ? new RegExp(`\\b${target}\\s*=\\s*${ROUTES_CALL}\\s*\\(`).test(
            childSource,
          )
        : false;
      if (isRoutes) walk(childFile, target, [...prefix, key], depth + 1);
      else tree.set([...prefix, key].join(" "), childFile);
    }
  };
  walk(ROOT_FILE, "routes", [], 0);
  return tree;
}

/** Line ranges (1-based) of `parameters:` and `docs:` blocks in a defineCommand. */
export function contractRanges(source: string): [number, number][] {
  const out: [number, number][] = [];
  const lineOf = (i: number) => source.slice(0, i).split("\n").length;
  for (const m of source.matchAll(/\b(parameters|docs|experimental)\s*:\s*/g)) {
    const at = m.index + m[0].length;
    const end =
      source[at] === "{" ? matchBrace(source, at) : source.indexOf("\n", at);
    out.push([lineOf(m.index), lineOf(end)]);
  }
  return out;
}

function changedLines(
  base: string,
  head: string,
  file: string,
  cwd?: string,
): [Set<number>, Set<number>] {
  const old = new Set<number>();
  const neu = new Set<number>();
  const diff = git(["diff", "-U0", "-w", base, head, "--", file], cwd);
  for (const m of diff.matchAll(
    /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm,
  )) {
    const [o, oc, n, nc] = [m[1], m[2] ?? "1", m[3], m[4] ?? "1"].map(
      Number,
    ) as [number, number, number, number];
    for (let i = 0; i < oc; i++) old.add(o + i);
    for (let i = 0; i < nc; i++) neu.add(n + i);
  }
  return [old, neu];
}

function touchesContract(
  base: string,
  head: string,
  file: string,
  cwd?: string,
): boolean {
  const [old, neu] = changedLines(base, head, file, cwd);
  for (const [rev, lines] of [
    [base, old],
    [head, neu],
  ] as const) {
    const ranges = contractRanges(show(rev, file, cwd) ?? "");
    for (const n of lines)
      if (ranges.some(([a, b]) => n >= a && n <= b)) return true;
  }
  return false;
}

const isTest = (f: string) => /\.test\.ts$|test-helpers\.ts$/.test(f);

export function detect(base: string, head: string, cwd?: string): Surface[] {
  const changed = git(["diff", "--name-only", "--no-renames", base, head], cwd)
    .split("\n")
    .filter((f) => f && !isTest(f));
  const before = commandTree(base, cwd);
  const after = commandTree(head, cwd);
  const out: Surface[] = [];
  for (const name of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    const file = after.get(name) ?? before.get(name) ?? "";
    if (!before.has(name))
      out.push({
        kind: "cli",
        name,
        change: "added",
        tags: ["contract"],
        files: [file],
      });
    else if (!after.has(name))
      out.push({
        kind: "cli",
        name,
        change: "removed",
        tags: ["contract"],
        files: [file],
      });
    else if (changed.includes(file)) {
      const tag = touchesContract(base, head, file, cwd) ? "contract" : "impl";
      out.push({
        kind: "cli",
        name,
        change: "modified",
        tags: [tag],
        files: [file],
      });
    }
  }
  // Route-group docs (brief / fullDescription) in an index.ts.
  for (const f of changed.filter(
    (f) => f.startsWith("src/commands/") && f.endsWith("/index.ts"),
  )) {
    const group = f
      .slice("src/commands/".length, -"/index.ts".length)
      .replaceAll("/", " ");
    if (!out.some((s) => s.name === group || s.name.startsWith(`${group} `))) {
      out.push({
        kind: "cli",
        name: group,
        change: "modified",
        tags: ["contract"],
        files: [f],
      });
    }
  }
  const shared = changed.filter((f) =>
    SHARED_PREFIXES.some((p) => f.startsWith(p)),
  );
  if (shared.length) {
    out.push({
      kind: "cli",
      name: "(shared src/lib, src/rest)",
      change: "modified",
      tags: ["indirect"],
      files: shared,
    });
  }
  return out;
}

const MAX_ROWS = 20;
export const MARKER = "<!-- observe-cli-surface-detect -->";

export function markdown(surfaces: Surface[]): string {
  if (!surfaces.length) return "";
  const ordered = [...surfaces].sort(
    (a, b) =>
      Number(!a.tags.includes("contract")) -
        Number(!b.tags.includes("contract")) ||
      Number(a.change === "modified") - Number(b.change === "modified") ||
      a.name.localeCompare(b.name),
  );
  const rows = ordered.slice(0, MAX_ROWS).map((s) => {
    const label = s.name.startsWith("(") ? s.name : `\`observe ${s.name}\``;
    return `| ${label} | ${s.change} | ${s.tags.join(", ")} |`;
  });
  if (ordered.length > MAX_ROWS)
    rows.push(`| … ${String(ordered.length - MAX_ROWS)} more | | |`);
  const contract = surfaces.filter((s) => s.tags.includes("contract")).length;
  return [
    MARKER,
    `This PR touches ${String(surfaces.length)} CLI command surface(s), ${String(contract)} with a contract change. ` +
      "Advisory only: nothing is gated yet; under the eval gate each would need eval coverage.",
    "",
    "| Command | Change | Tags |",
    "|---|---|---|",
    ...rows,
  ].join("\n");
}

function main(argv: string[]): void {
  const arg = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const base = arg("--base") ?? "HEAD^";
  const head = arg("--head") ?? "HEAD";
  const surfaces = detect(base, head);
  const report = {
    repo: "observeinc/cli",
    base: git(["rev-parse", base]).trim(),
    head: git(["rev-parse", head]).trim(),
    pr: process.env.PR_NUMBER ?? null,
    would_gate: surfaces.length > 0,
    surfaces,
  };
  const json = arg("--json");
  if (json) writeFileSync(json, `${JSON.stringify(report, null, 2)}\n`);
  if (argv.includes("--markdown")) process.stdout.write(markdown(surfaces));
  else if (!json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (import.meta.main) main(process.argv.slice(2));
