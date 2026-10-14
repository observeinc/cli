/**
 * Print the CLI command tree of the checkout in the current directory as JSON.
 *
 * Imports the real `routes` (and `app`) from src/app.ts, so it needs codegen
 * output and node_modules. For every command and route group path it records
 * the agent-visible contract (docs, flags, positionals, aliases, hidden), the
 * file that defines it and the src files it imports. surface-detect.ts runs
 * this at the base and head commits and diffs the two.
 *
 * Usage (from a CLI checkout): bun run <path>/surface-dump.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";

export interface DumpedSurface {
  kind: "command" | "group";
  /** Repo-relative file that exports it, or null if none does. */
  file: string | null;
  /** Repo-relative src files it imports, transitively (groups: none). */
  closure: string[];
  /** Everything an agent can see in `--help` or completion. */
  contract: unknown;
}

export type Dump = Record<string, DumpedSurface>;

export const ROOT = "(root)";

interface Entry {
  name: { original: string };
  target: Target;
  aliases: readonly string[];
  hidden: boolean;
}

interface Target {
  kind: unknown;
  brief?: string;
  fullDescription?: string;
  parameters?: unknown;
  getAllEntries?: () => readonly Entry[];
  getDefaultCommand?: () => unknown;
}

/** JSON-safe copy; functions become their name (a flag parser swap shows). */
function plain(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_k, v: unknown) =>
      typeof v === "function" ? `fn:${v.name}` : v,
    ),
  );
}

const isGroup = (t: Target) => typeof t.getAllEntries === "function";

function groupContract(map: Target): Record<string, unknown> {
  const entries = map.getAllEntries?.() ?? [];
  const def = map.getDefaultCommand?.();
  return {
    brief: map.brief,
    fullDescription: map.fullDescription,
    defaultCommand: entries.find((e) => e.target === def)?.name.original,
  };
}

const scanner = new Bun.Transpiler({ loader: "ts" });

/** Repo-relative src files `file` imports directly (static and dynamic). */
function imports(root: string, file: string): string[] {
  const abs = path.join(root, file);
  let text: string;
  try {
    text = readFileSync(abs, "utf-8");
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const imp of scanner.scanImports(text)) {
    try {
      const rel = path.relative(
        root,
        Bun.resolveSync(imp.path, path.dirname(abs)),
      );
      if (rel.startsWith("src/")) out.push(rel);
    } catch {
      // Unresolvable (missing file or package): not a src dependency.
    }
  }
  return out;
}

export async function dump(root: string): Promise<Dump> {
  const mod = (await import(path.join(root, "src/app.ts"))) as {
    routes: Target;
    app?: { config?: unknown };
  };
  const out: Dump = {};
  const paths = new Map<object, string[]>();
  const record = (name: string, target: Target, contract: unknown) => {
    out[name] = {
      kind: isGroup(target) ? "group" : "command",
      file: null,
      closure: [],
      contract,
    };
    paths.set(target, [...(paths.get(target) ?? []), name]);
  };
  record(ROOT, mod.routes, {
    ...groupContract(mod.routes),
    app: plain(mod.app?.config),
  });
  const walk = (map: Target, prefix: string[], depth: number) => {
    if (depth > 8) return;
    for (const e of map.getAllEntries?.() ?? []) {
      const name = [...prefix, e.name.original];
      const common = { hidden: e.hidden, aliases: [...e.aliases] };
      if (isGroup(e.target)) {
        record(name.join(" "), e.target, {
          ...groupContract(e.target),
          ...common,
        });
        walk(e.target, name, depth + 1);
      } else {
        record(name.join(" "), e.target, {
          brief: e.target.brief,
          fullDescription: e.target.fullDescription,
          parameters: plain(e.target.parameters),
          ...common,
        });
      }
    }
  };
  walk(mod.routes, [], 0);

  // Defining files: walk app.ts's static imports (all already loaded) and
  // match each module's exports to tree objects by identity.
  const seen = new Set<string>();
  const todo = ["src/app.ts"];
  while (todo.length) {
    const f = todo.pop() ?? "";
    if (seen.has(f) || f.endsWith(".test.ts")) continue;
    seen.add(f);
    const exports = (await import(path.join(root, f))) as Record<
      string,
      unknown
    >;
    for (const value of Object.values(exports)) {
      if (typeof value !== "object" || value === null) continue;
      for (const name of paths.get(value) ?? []) {
        const s = out[name];
        if (s && !s.file) s.file = f;
      }
    }
    todo.push(...imports(root, f));
  }

  // Closures: a command's imports, transitively, without entering a file
  // that defines another surface.
  const surfaceFiles = new Set(
    Object.values(out).flatMap((s) => (s.file ? [s.file] : [])),
  );
  for (const s of Object.values(out)) {
    if (s.kind === "group" || !s.file) continue;
    const reach = new Set<string>();
    const stack = imports(root, s.file);
    while (stack.length) {
      const f = stack.pop() ?? "";
      if (reach.has(f) || f === s.file || surfaceFiles.has(f)) continue;
      reach.add(f);
      stack.push(...imports(root, f));
    }
    s.closure = [...reach].sort();
  }
  return out;
}

if (import.meta.main) {
  process.stdout.write(`${JSON.stringify(await dump(process.cwd()))}\n`);
}
