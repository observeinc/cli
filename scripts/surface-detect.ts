/**
 * Detect observe CLI commands a PR adds, changes or removes.
 *
 * Builds the command tree statically from the Stricli route maps
 * (`defineRoutes({ routes: { ... } })`) at the base and head commits, so it
 * needs no codegen or secrets. Advisory only: CI posts the result and never
 * fails on it.
 *
 * Tags: `contract` when a command's flags, positional args or docs changed,
 * or the command was added or removed; `impl` when only its code or a helper
 * it imports under src/commands changed; `indirect` for any other changed
 * src file (src/lib, src/rest, src/gql, src/context.ts, ...).
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
const ROOT_GROUP = "(root)";
// Route maps are built with the repo wrapper or Stricli directly.
const ROUTES_CALL = "(?:defineRoutes|buildRouteMap)";
const COMMANDS_DIR = "src/commands/";
// Agent-visible blocks in a defineCommand / route map.
const COMMAND_CONTRACT_KEYS = ["parameters", "docs", "experimental"];
const ROUTES_CONTRACT_KEYS = ["routes", "docs", "hideRoute", "defaultCommand"];
// Route-map keys other than `routes`; an added or removed child explains `routes`.
const GROUP_DOC_KEYS = ["docs", "hideRoute", "defaultCommand"];

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

/** Index of the bracket closing the `{`, `[` or `(` at `open`. */
function matchBracket(text: string, open: number): number {
  const pairs: Record<string, string> = { "{": "}", "[": "]", "(": ")" };
  const close = pairs[text[open] ?? ""];
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === text[open]) depth++;
    else if (text[i] === close && --depth === 0) return i;
  }
  return text.length;
}

function matchBrace(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return i;
  }
  return text.length;
}

/**
 * Full command path ("monitor mute list") -> defining file, at `rev`.
 * `groups`, if given, gets each route group's path -> its route-map file.
 */
export function commandTree(
  rev: string,
  cwd?: string,
  groups?: Map<string, string>,
): Map<string, string> {
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
      const name = [...prefix, key].join(" ");
      if (isRoutes) {
        groups?.set(name, childFile);
        walk(childFile, target, [...prefix, key], depth + 1);
      } else tree.set(name, childFile);
    }
  };
  walk(ROOT_FILE, "routes", [], 0);
  return tree;
}

/** Line ranges (1-based) of the `keys:` blocks (default: a defineCommand's contract). */
export function contractRanges(
  source: string,
  keys: string[] = COMMAND_CONTRACT_KEYS,
): [number, number][] {
  const out: [number, number][] = [];
  const lineOf = (i: number) => source.slice(0, i).split("\n").length;
  const blocks: string[] = [];
  for (const m of source.matchAll(
    new RegExp(`\\b(${keys.join("|")})\\s*:\\s*`, "g"),
  )) {
    const at = m.index + m[0].length;
    const end =
      source[at] === "{" ? matchBrace(source, at) : source.indexOf("\n", at);
    out.push([lineOf(m.index), lineOf(end)]);
    blocks.push(source.slice(at, end + 1));
  }
  // buildApplication options (scanner, name) shape every command's parsing.
  for (const m of source.matchAll(/\bbuildApplication\s*\(/g)) {
    const open = source.indexOf("{", m.index);
    if (open >= 0) out.push([lineOf(open), lineOf(matchBrace(source, open))]);
  }
  // Top-level constants a contract block reads (flag values, help text).
  const used = blocks.join("\n");
  for (const m of source.matchAll(
    /^(?:export\s+)?(?:const|let)\s+(\w+)\b[^=]*=\s*/gm,
  )) {
    const name = m[1] ?? "";
    if (!name || !new RegExp(`\\b${name}\\b`).test(used)) continue;
    const at = m.index + m[0].length;
    const open = source[at];
    const end =
      open === "{" || open === "["
        ? matchBracket(source, at)
        : source.indexOf(";", at);
    out.push([lineOf(m.index), lineOf(end < 0 ? source.length : end)]);
  }
  return out;
}

/** Changed line numbers; `oldFile` is the base path when the file moved. */
function changedLines(
  base: string,
  head: string,
  file: string,
  cwd?: string,
  oldFile: string = file,
): [Set<number>, Set<number>] {
  const old = new Set<number>();
  const neu = new Set<number>();
  const diff =
    oldFile === file
      ? git(["diff", "-U0", "-w", base, head, "--", file], cwd)
      : git(
          ["diff", "-U0", "-w", `${base}:${oldFile}`, `${head}:${file}`],
          cwd,
        );
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
  keys: string[] = COMMAND_CONTRACT_KEYS,
  oldFile: string = file,
): boolean {
  const [old, neu] = changedLines(base, head, file, cwd, oldFile);
  for (const [rev, path, lines] of [
    [base, oldFile, old],
    [head, file, neu],
  ] as const) {
    const ranges = contractRanges(show(rev, path, cwd) ?? "", keys);
    for (const n of lines)
      if (ranges.some(([a, b]) => n >= a && n <= b)) return true;
  }
  return false;
}

const isTest = (f: string) => /\.test\.ts$|test-helpers\.ts$/.test(f);

/** Helper files under src/commands that `file` imports, transitively. */
function commandHelpers(
  rev: string,
  file: string,
  exists: (p: string) => boolean,
  cwd?: string,
): Set<string> {
  const seen = new Set<string>();
  const todo = [file];
  while (todo.length) {
    const f = todo.pop() ?? "";
    for (const dep of new Set(
      importMap(show(rev, f, cwd) ?? "", f, exists).values(),
    )) {
      if (dep.startsWith(COMMANDS_DIR) && dep !== file && !seen.has(dep)) {
        seen.add(dep);
        todo.push(dep);
      }
    }
  }
  return seen;
}

export function detect(base: string, head: string, cwd?: string): Surface[] {
  // Git rename detection: identical moves (R100) are not changes; every
  // renamed file's old path is accounted for by its new one.
  const renamedFrom = new Set<string>();
  const pureMoves = new Set<string>();
  for (const line of git(
    ["diff", "--name-status", "-M", base, head],
    cwd,
  ).split("\n")) {
    const [status = "", from = "", to = ""] = line.split("\t");
    if (!status.startsWith("R")) continue;
    renamedFrom.add(from);
    if (status === "R100") pureMoves.add(to);
  }
  const changed = git(["diff", "--name-only", "--no-renames", base, head], cwd)
    .split("\n")
    .filter((f) => f && !isTest(f) && !pureMoves.has(f) && !renamedFrom.has(f));
  const changedSet = new Set(changed);
  const beforeGroups = new Map([[ROOT_GROUP, ROOT_FILE]]);
  const afterGroups = new Map([[ROOT_GROUP, ROOT_FILE]]);
  const before = commandTree(base, cwd, beforeGroups);
  const after = commandTree(head, cwd, afterGroups);
  const headFiles = new Set(
    git(["ls-tree", "-r", "--name-only", head, "--", "src"], cwd).split("\n"),
  );
  const exists = (p: string) => headFiles.has(p);
  const baseFiles = new Set(
    git(["ls-tree", "-r", "--name-only", base, "--", "src"], cwd).split("\n"),
  );
  const baseExists = (p: string) => baseFiles.has(p);
  const commandFiles = new Set([...before.values(), ...after.values()]);
  const attributed = new Set<string>();
  const out: Surface[] = [];
  const row = (
    name: string,
    change: Surface["change"],
    tag: string,
    files: string[],
  ) => {
    files.forEach((f) => attributed.add(f));
    out.push({ kind: "cli", name, change, tags: [tag], files });
  };
  for (const name of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    const file = after.get(name) ?? before.get(name) ?? "";
    const rev = after.has(name) ? head : base;
    const revExists = after.has(name) ? exists : baseExists;
    const helpers = [...commandHelpers(rev, file, revExists, cwd)].filter(
      (h) => changedSet.has(h) && !commandFiles.has(h),
    );
    if (!before.has(name)) row(name, "added", "contract", [file, ...helpers]);
    else if (!after.has(name))
      row(name, "removed", "contract", [file, ...helpers]);
    else if (changedSet.has(file) || before.get(name) !== file) {
      // Path changed: always compare against the command's own base file, since
      // git pairs renames by content, not by command.
      const oldFile = before.get(name) ?? file;
      const [o, n] = changedLines(base, head, file, cwd, oldFile);
      if (oldFile !== file && !o.size && !n.size && !helpers.length) continue;
      const tag = touchesContract(
        base,
        head,
        file,
        cwd,
        COMMAND_CONTRACT_KEYS,
        oldFile,
      )
        ? "contract"
        : "impl";
      row(name, "modified", tag, [file, ...helpers]);
    } else if (helpers.length) {
      row(name, "modified", "impl", helpers);
    }
  }
  // Route maps, per group: compared against the group's own base file, so a
  // moved or repointed group keeps its docs changes.
  for (const [group, file] of afterGroups) {
    const oldFile = beforeGroups.get(group);
    // A new group: its added commands already report it.
    if (!oldFile) {
      attributed.add(file);
      continue;
    }
    attributed.add(oldFile);
    if (oldFile === file && !changedSet.has(file)) continue;
    const [o, n] = changedLines(base, head, file, cwd, oldFile);
    if (oldFile !== file && !o.size && !n.size) {
      attributed.add(file);
      continue;
    }
    const root = group === ROOT_GROUP;
    const contractIn = (keys: string[]) =>
      touchesContract(base, head, file, cwd, keys, oldFile);
    const docs = !root && contractIn(GROUP_DOC_KEYS);
    const contract = root ? contractIn(ROUTES_CONTRACT_KEYS) : docs;
    const routes = contractIn(["routes"]);
    const childAddedOrRemoved = out.some(
      (s) => s.name.startsWith(`${group} `) && s.change !== "modified",
    );
    // Skip only when the route-map edit is just the routes an added or
    // removed child already explains.
    if (!docs && routes && childAddedOrRemoved && !root) attributed.add(file);
    else
      row(group, "modified", contract || routes ? "contract" : "impl", [file]);
  }
  // A removed group: its removed commands already report it.
  for (const [group, file] of beforeGroups)
    if (!afterGroups.has(group)) attributed.add(file);
  // Anything else under src/ (lib, rest, gql, context.ts, bin.ts, ...).
  const shared = changed.filter(
    (f) => f.startsWith("src/") && !attributed.has(f) && !commandFiles.has(f),
  );
  if (shared.length) {
    const dirs = [...new Set(shared.map((f) => path.posix.dirname(f)))].sort();
    row(`(shared ${dirs.join(", ")})`, "modified", "indirect", shared);
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
