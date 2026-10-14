/**
 * Detect observe CLI commands a PR adds, changes or removes.
 *
 * Dumps the real command tree (surface-dump.ts) at the base and head commits
 * and diffs them, so it needs node_modules and codegen output, reused from the
 * current checkout. Both commits must therefore build against the current
 * codegen output, as the PR base does whenever main's CI is green. Advisory
 * only: CI posts the result and never fails on it.
 *
 * Tags: `contract` when a command or group's agent-visible contract (docs,
 * flags, positionals, aliases, hidden) changed, or it was added or removed;
 * `impl` when only its own file or a src/commands file it imports changed;
 * `indirect` when only another src file it imports changed. Changed src files
 * no command imports go in one `(shared ...)` indirect row.
 *
 * Usage:
 *   bun run scripts/surface-detect.ts [--base REV] [--head REV] [--json FILE] [--markdown]
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ROOT, type Dump } from "./surface-dump";

export interface Surface {
  kind: "cli";
  name: string;
  change: "added" | "modified" | "removed";
  tags: string[];
  files: string[];
}

const COMMANDS_DIR = "src/commands/";
// Untracked inputs the dump needs, reused from the current checkout.
const SHARED_INPUTS = [
  "node_modules",
  "src/rest/generated",
  "src/gql/generated",
];

function git(args: string[], cwd?: string): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf-8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

/** Dump the command tree at `rev` from a throwaway worktree. */
export function dumpAt(rev: string, cwd: string = process.cwd()): Dump {
  const wt = mkdtempSync(path.join(tmpdir(), "surface-"));
  git(["worktree", "add", "-q", "--detach", wt, rev], cwd);
  try {
    for (const p of SHARED_INPUTS) {
      const from = path.join(cwd, p);
      if (existsSync(from) && !existsSync(path.join(wt, p)))
        symlinkSync(from, path.join(wt, p));
    }
    let out: string;
    try {
      out = execFileSync(
        "bun",
        ["run", path.join(import.meta.dir, "surface-dump.ts")],
        {
          cwd: wt,
          encoding: "utf-8",
          maxBuffer: 64 * 1024 * 1024,
          stdio: ["ignore", "pipe", "pipe"],
          env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
        },
      );
    } catch (err) {
      const stderr = String((err as { stderr?: unknown }).stderr ?? err);
      const reason =
        stderr.split("\n").find((l) => l.trim()) ?? "unknown error";
      throw new Error(`cannot load the command tree at ${rev}: ${reason}`, {
        cause: err,
      });
    }
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
    for (const f of files) if (!isTest(f)) out.add(f);
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
  ) => {
    const unique = [...new Set(files)];
    unique.forEach((f) => attributed.add(f));
    out.push({ kind: "cli", name, change, tags: [tag], files: unique });
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
    if (!b) row(name, "added", "contract", [...own, ...hits]);
    else if (!a) row(name, "removed", "contract", [...own, ...hits]);
    else if (!same(b.contract, a.contract))
      row(name, "modified", "contract", [...own, ...hits]);
    else if (hits.length) {
      if (a.kind === "group") {
        // Wiring an added or removed child into the route map explains it.
        const prefix = name === ROOT ? "" : `${name} `;
        const child = out.some(
          (s) => s.name.startsWith(prefix) && s.change !== "modified",
        );
        if (child) continue;
      }
      const impl = hits.some(
        (f) => own.includes(f) || f.startsWith(COMMANDS_DIR),
      );
      row(name, "modified", impl ? "impl" : "indirect", hits);
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
