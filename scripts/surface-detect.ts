/**
 * Detect observe CLI commands a PR adds, changes or removes.
 *
 * Dumps the real command tree (surface-dump.ts) at the base and head commits
 * and diffs them. It reuses node_modules and the current checkout's codegen
 * output, and reruns codegen for any other commit, so it needs the codegen
 * secrets. Advisory only: CI posts the result and never fails on it.
 *
 * Tags: `contract` when a command or group's agent-visible contract (docs,
 * flags, positionals, aliases, hidden) changed, or it was added or removed;
 * `impl` when only its own file or a src/commands file it imports changed;
 * `indirect` when only another src file it imports changed. Changed src files
 * no command imports go in one `(shared ...)` indirect row.
 *
 * Usage:
 *   bun run scripts/surface-detect.ts [--base REV] [--head REV] [--json FILE] [--markdown]
 *     [--coverage-index PATH]
 *
 * `--coverage-index` (or COVERAGE_INDEX) is a JSON file mapping each
 * `observe <command>` to how many eval stems cover it. Without one, the
 * detector reads scripts/eval-coverage.json as committed at the base, which
 * the observe monorepo's Harbor nightly maintains, so a PR cannot mark its
 * own commands covered. Counts only: stem ids stay private. No file at the
 * base means no coverage column; an unreadable index is noted in the
 * comment. The process always exits 0.
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ROOT, type Dump } from "./surface-dump";

export interface Surface {
  kind: "cli";
  /** Dump kind; omitted on `(shared …)` rows. Groups are not eval-gated. */
  node?: "command" | "group";
  name: string;
  /** Primary command this row aliases; skipped for eval-coverage lookup. */
  aliasOf?: string;
  change: "added" | "modified" | "removed";
  tags: string[];
  files: string[];
  coverage?: Coverage;
}

export interface Coverage {
  status: "covered" | "uncovered" | "unmapped";
  /** Eval stems covering the command. */
  evals: number;
  reason?: string;
}

export interface CoverageIndex {
  version?: number;
  /** `observe <command>` -> number of covering stems. */
  cli?: Record<string, number>;
}

export type CoverageIndexLoad =
  | { ok: true; index: CoverageIndex }
  | { ok: false; error: string };

const COMMANDS_DIR = "src/commands/";
/** Repo path of the counts file the observe Harbor nightly maintains. */
export const COVERAGE_INDEX_PATH = "scripts/eval-coverage.json";
// Untracked codegen output; other commits regenerate it from their own sources.
const GENERATED = ["src/rest/generated", "src/gql/generated"];

function git(args: string[], cwd?: string): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf-8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

/** The line of a failed command's stderr that names the error. */
export function errorReason(stderr: string): string {
  // Skip code-frame lines (`12 | ...`, carets), then prefer `error: ...`
  // or `SomeError: ...` over any line merely mentioning "error".
  const lines = stderr
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !/^\d+\s*\||^\^/.test(l));
  return (
    lines.find((l) => /^(error:|\w*Error\b)/.test(l)) ??
    lines.find((l) => /error/i.test(l)) ??
    lines.at(-1) ??
    "unknown error"
  );
}

/** Run a command in `cwd`; on failure, throw its most error-like stderr line. */
function run(rev: string, cwd: string, cmd: string, args: string[]): string {
  try {
    return execFileSync(cmd, args, {
      cwd,
      encoding: "utf-8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
    });
  } catch (err) {
    const reason = errorReason(
      String((err as { stderr?: unknown }).stderr ?? err),
    );
    throw new Error(`cannot load the command tree at ${rev}: ${reason}`, {
      cause: err,
    });
  }
}

function hasCodegen(dir: string): boolean {
  const pkg = path.join(dir, "package.json");
  if (!existsSync(pkg)) return false;
  const { scripts } = JSON.parse(readFileSync(pkg, "utf-8")) as {
    scripts?: Record<string, string>;
  };
  return Boolean(scripts?.codegen);
}

/** Dump the command tree at `rev` from a throwaway worktree. */
export function dumpAt(rev: string, cwd: string = process.cwd()): Dump {
  const wt = mkdtempSync(path.join(tmpdir(), "surface-"));
  git(["worktree", "add", "-q", "--detach", wt, rev], cwd);
  try {
    const link = (p: string) => {
      const from = path.join(cwd, p);
      const to = path.join(wt, p);
      if (!existsSync(from) || existsSync(to)) return;
      mkdirSync(path.dirname(to), { recursive: true });
      symlinkSync(from, to);
    };
    link("node_modules");
    link(".env");
    // Reuse codegen output only for the commit it was built from; another
    // commit may import documents or APIs the current one dropped.
    const current =
      git(["rev-parse", rev], cwd) === git(["rev-parse", "HEAD"], cwd);
    if (current || !hasCodegen(wt)) GENERATED.forEach(link);
    else run(rev, wt, "bun", ["run", "--silent", "codegen"]);
    const out = run(rev, wt, "bun", [
      "run",
      path.join(import.meta.dir, "surface-dump.ts"),
    ]);
    return JSON.parse(out) as Dump;
  } finally {
    git(["worktree", "remove", "--force", wt], cwd);
  }
}

const isTest = (f: string) => /\.test\.ts$|test-helpers\.ts$/.test(f);

/** Files that changed between `base` and `head`; identical renames don't count. */
export function changedFiles(
  base: string,
  head: string,
  cwd?: string,
): string[] {
  const out = new Set<string>();
  for (const line of git(
    ["diff", "--name-status", "-M", base, head],
    cwd,
  ).split("\n")) {
    const [status = "", ...files] = line.split("\t");
    if (!status || status === "R100") continue;
    for (const f of files) {
      if (isTest(f)) continue;
      // Codegen inlines a document into untracked output; the module next to
      // it (foo.graphql -> foo.ts) is what commands import.
      const sibling = f.replace(/\.graphql$/, ".ts");
      const has = (rev: string) =>
        sibling !== f &&
        git(["ls-tree", "--name-only", rev, "--", sibling], cwd).trim() ===
          sibling;
      out.add(has(head) || has(base) ? sibling : f);
    }
  }
  return [...out].sort();
}

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

/** Diff two dumps into report rows, given the changed files. */
export function classify(
  before: Dump,
  after: Dump,
  changed: readonly string[],
): Surface[] {
  const changedSet = new Set(changed);
  const out: Surface[] = [];
  const attributed = new Set<string>();
  const row = (
    name: string,
    change: Surface["change"],
    tag: string,
    files: string[],
    node?: Surface["node"],
    aliasOf?: string,
  ) => {
    const unique = [...new Set(files)];
    unique.forEach((f) => attributed.add(f));
    out.push({
      kind: "cli",
      ...(node ? { node } : {}),
      name,
      ...(aliasOf ? { aliasOf } : {}),
      change,
      tags: [tag],
      files: unique,
    });
  };
  const names = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  // Groups go last so they can see whether a child was added or removed.
  names.sort(
    (a, b) =>
      Number((after[a] ?? before[a])?.kind === "group") -
        Number((after[b] ?? before[b])?.kind === "group") || a.localeCompare(b),
  );
  for (const name of names) {
    const b = before[name];
    const a = after[name];
    const own = [b?.file, a?.file].filter((f): f is string => !!f);
    const hits = [...own, ...(b?.closure ?? []), ...(a?.closure ?? [])].filter(
      (f) => changedSet.has(f),
    );
    // A shared file (an aliased group's index.ts) is accounted for either way.
    own.forEach((f) => attributed.add(f));
    const node = (a ?? b)?.kind === "group" ? "group" : "command";
    const aliasOf = (a ?? b)?.aliasOf;
    if (!b) row(name, "added", "contract", [...own, ...hits], node, aliasOf);
    else if (!a)
      row(name, "removed", "contract", [...own, ...hits], node, aliasOf);
    else if (!same(b.contract, a.contract))
      row(name, "modified", "contract", [...own, ...hits], node, aliasOf);
    else if (hits.length) {
      if (a.kind === "group") {
        // Wiring a direct child in or out of the route map explains it.
        const prefix = name === ROOT ? "" : `${name} `;
        const direct = (d: Dump) =>
          Object.keys(d).filter(
            (n) =>
              n !== ROOT &&
              n.startsWith(prefix) &&
              !n.slice(prefix.length).includes(" "),
          );
        const child = [...direct(before), ...direct(after)].some(
          (n) => !before[n] || !after[n],
        );
        if (child) continue;
      }
      const impl = hits.some(
        (f) => own.includes(f) || f.startsWith(COMMANDS_DIR),
      );
      row(name, "modified", impl ? "impl" : "indirect", hits, node, aliasOf);
    }
  }
  // Anything else under src/ (bin.ts, unused lib code, ...).
  const shared = changed.filter(
    (f) => f.startsWith("src/") && !attributed.has(f),
  );
  if (shared.length) {
    const dirs = [...new Set(shared.map((f) => path.posix.dirname(f)))].sort();
    row(`(shared ${dirs.join(", ")})`, "modified", "indirect", shared);
  }
  return out;
}

export function detect(base: string, head: string, cwd?: string): Surface[] {
  const dir = cwd ?? process.cwd();
  return classify(
    dumpAt(base, dir),
    dumpAt(head, dir),
    changedFiles(base, head, dir),
  );
}

const MAX_ROWS = 20;
export const MARKER = "<!-- observe-cli-surface-detect -->";

const DUMP_FAIL = "cannot load the command tree";

export function isDumpFailure(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith(DUMP_FAIL);
}

export function dumpFailureMarkdown(): string {
  return [
    MARKER,
    "Could not dump a command tree; see the run log.",
    "Coverage was not checked; the PR is not blocked.",
    "",
  ].join("\n");
}

function asText(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Error) return v.message;
  if (v instanceof Uint8Array) return new TextDecoder().decode(v);
  return "";
}

/** Job-log text for a dump failure. Captured child stderr stays off stdout. */
export function dumpFailureLog(err: unknown): string {
  const first = (err instanceof Error ? err.message : String(err)).split(
    "\n",
  )[0];
  const cause = err instanceof Error ? err.cause : undefined;
  const lines = [first];
  if (cause && typeof cause === "object") {
    const rec = cause as {
      stderr?: unknown;
      status?: unknown;
      signal?: unknown;
      message?: unknown;
    };
    const stderr = asText(rec.stderr).trimEnd();
    if (stderr) lines.push(stderr);
    if (rec.signal != null && rec.signal !== "")
      lines.push(`signal ${asText(rec.signal)}`);
    else if (rec.status != null) lines.push(`exit ${asText(rec.status)}`);
    else if (!stderr && asText(rec.message)) lines.push(asText(rec.message));
  }
  return lines.filter(Boolean).join("\n");
}

export function indexKey(name: string): string {
  return `observe ${name}`;
}

export function coverageOf(
  s: Surface,
  index: CoverageIndex,
): Coverage | undefined {
  if (
    s.name.startsWith("(") ||
    s.change === "removed" ||
    s.node === "group" ||
    s.aliasOf
  )
    return undefined;
  const n = index.cli?.[indexKey(s.name)];
  if (n === undefined) {
    return {
      status: "unmapped",
      evals: 0,
      reason: "unknown to the coverage index",
    };
  }
  if (n > 0) return { status: "covered", evals: n };
  return { status: "uncovered", evals: 0, reason: "no covering stem" };
}

export function attachCoverage(
  surfaces: Surface[],
  index: CoverageIndex,
): void {
  for (const s of surfaces) s.coverage = coverageOf(s, index);
}

/** A stem count, or a stem id list counted on load so ids go no further. */
function stemCount(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isInteger(v) && v >= 0) return v;
  if (Array.isArray(v) && v.every((x) => typeof x === "string"))
    return v.length;
  return undefined;
}

function parseIndex(raw: string, label: string): CoverageIndexLoad {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: `${label}: not valid JSON` };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: `${label}: not a JSON object` };
  }
  const rec = parsed as Record<string, unknown>;
  if (rec.cli === undefined) {
    return { ok: false, error: `${label}: no cli map` };
  }
  if (
    typeof rec.cli !== "object" ||
    rec.cli === null ||
    Array.isArray(rec.cli)
  ) {
    return { ok: false, error: `${label}: cli is not an object` };
  }
  const cli: Record<string, number> = {};
  for (const [k, v] of Object.entries(rec.cli as Record<string, unknown>)) {
    const n = stemCount(v);
    if (n === undefined) {
      return {
        ok: false,
        error: `${label}: cli[${JSON.stringify(k)}] is not a stem count`,
      };
    }
    cli[k] = n;
  }
  const index: CoverageIndex = { cli };
  if (typeof rec.version === "number") index.version = rec.version;
  return { ok: true, index };
}

export function loadCoverageIndex(file: string): CoverageIndexLoad {
  try {
    return parseIndex(readFileSync(file, "utf-8"), file);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `eval coverage index unreachable (${file}): ${msg}`,
    };
  }
}

/** An explicit index: --coverage-index, then COVERAGE_INDEX. */
export function coverageIndexSource(
  argv: string[],
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const i = argv.indexOf("--coverage-index");
  const flag = i >= 0 ? argv[i + 1] : undefined;
  if (flag) return flag;
  if (env.COVERAGE_INDEX) return env.COVERAGE_INDEX;
  return undefined;
}

/**
 * The counts file as committed at `base`, so a PR cannot mark its own
 * commands covered. undefined when `base` has no such file yet.
 */
export function baseCoverageIndex(
  base: string,
  cwd?: string,
): CoverageIndexLoad | undefined {
  let raw: string;
  try {
    raw = execFileSync("git", ["show", `${base}:${COVERAGE_INDEX_PATH}`], {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return undefined;
  }
  return parseIndex(raw, `${base}:${COVERAGE_INDEX_PATH}`);
}

function coverageCell(s: Surface): string {
  const cov = s.coverage;
  if (!cov) return "";
  if (cov.status === "covered") return `${String(cov.evals)} eval(s)`;
  return `**none** (${cov.status})`;
}

export function markdown(
  surfaces: Surface[],
  opts: { indexError?: string } = {},
): string {
  if (!surfaces.length) return "";
  const ordered = [...surfaces].sort(
    (a, b) =>
      Number(!a.tags.includes("contract")) -
        Number(!b.tags.includes("contract")) ||
      Number(a.change === "modified") - Number(b.change === "modified") ||
      a.name.localeCompare(b.name),
  );
  const withCoverage = surfaces.some((s) => s.coverage);
  const rows = ordered.slice(0, MAX_ROWS).map((s) => {
    const label = s.name.startsWith("(") ? s.name : `\`observe ${s.name}\``;
    const base = `| ${label} | ${s.change} | ${s.tags.join(", ")} |`;
    return withCoverage ? `${base} ${coverageCell(s)} |` : base;
  });
  if (ordered.length > MAX_ROWS)
    rows.push(
      withCoverage
        ? `| … ${String(ordered.length - MAX_ROWS)} more | | | |`
        : `| … ${String(ordered.length - MAX_ROWS)} more | | |`,
    );
  const contract = surfaces.filter((s) => s.tags.includes("contract")).length;
  const header = withCoverage
    ? ["| Command | Change | Tags | Coverage |", "|---|---|---|---|"]
    : ["| Command | Change | Tags |", "|---|---|---|"];
  const out = [
    MARKER,
    `This PR touches ${String(surfaces.length)} CLI command surface(s), ${String(contract)} with a contract change. ` +
      "Advisory only: nothing is gated yet; under the eval gate each would need eval coverage.",
    "",
    ...header,
    ...rows,
  ];
  if (opts.indexError) {
    out.push(
      "",
      opts.indexError,
      "Coverage was not checked; the PR is not blocked.",
    );
  }
  const missing = ordered.filter(
    (s) =>
      s.coverage &&
      (s.coverage.status === "uncovered" || s.coverage.status === "unmapped"),
  );
  if (missing.length) {
    out.push("", "**Missing eval coverage:**");
    for (const s of missing.slice(0, MAX_ROWS)) {
      const label = `\`observe ${s.name}\``;
      const extra =
        s.coverage?.status === "unmapped" ? " (unmapped)" : " (uncovered)";
      out.push(`- ${label}: ${s.coverage?.reason ?? ""}${extra}`);
    }
    if (missing.length > MAX_ROWS)
      out.push(`- … ${String(missing.length - MAX_ROWS)} more`);
  }
  return out.join("\n");
}

export function main(argv: string[]): number {
  const arg = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const base = arg("--base") ?? "HEAD^";
  const head = arg("--head") ?? "HEAD";
  let surfaces: Surface[];
  try {
    surfaces = detect(base, head);
  } catch (err) {
    if (!isDumpFailure(err)) throw err;
    console.error(dumpFailureLog(err));
    if (argv.includes("--markdown"))
      process.stdout.write(dumpFailureMarkdown());
    return 0;
  }
  const source = coverageIndexSource(argv);
  let indexError: string | undefined;
  let indexLoaded = false;
  const loaded = source ? loadCoverageIndex(source) : baseCoverageIndex(base);
  if (loaded) {
    if (loaded.ok) {
      attachCoverage(surfaces, loaded.index);
      indexLoaded = true;
    } else {
      indexError = loaded.error;
    }
  }
  const report = {
    repo: "observeinc/cli",
    base: git(["rev-parse", base]).trim(),
    head: git(["rev-parse", head]).trim(),
    pr: process.env.PR_NUMBER ?? null,
    would_gate: surfaces.length > 0,
    coverage_index: indexLoaded,
    coverage_error: indexError ?? null,
    surfaces,
  };
  const json = arg("--json");
  if (json) writeFileSync(json, `${JSON.stringify(report, null, 2)}\n`);
  if (argv.includes("--markdown"))
    process.stdout.write(markdown(surfaces, { indexError }));
  else if (!json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  return 0;
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
