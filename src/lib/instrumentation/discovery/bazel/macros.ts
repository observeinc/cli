import { dirname } from "node:path";
import type { LanguageId } from "../../types";
import { parseBazelDefs, parseBazelLoads } from "./parser";
import type { BzlLoader } from "./labels";

export interface Family {
  rule: string;
  language: LanguageId;
  runtime: string;
}

interface ModuleInfo {
  localToExported: Map<string, string>;
  defs: { name: string; tokens: Set<string> }[];
}

function identifierTokens(text: string): Set<string> {
  return new Set(text.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []);
}

/**
 * Build a `macro name -> family` map by statically reading the `.bzl` load
 * closure of the audited BUILD files. Seeded with the well-known `*_binary`
 * rules; a def resolves to a family when its body references a rule/macro that
 * already resolves (directly, or transitively for wrappers-of-wrappers). Names
 * that never reach a well-known rule are simply absent from the map.
 */
export function buildMacroFamilyMap({
  buildLoads,
  loadBzl,
  seeds,
  maxFiles = 1000,
  maxDepth = 16,
}: {
  buildLoads: { label: string; fromAbsDir: string }[];
  loadBzl: BzlLoader;
  seeds: Record<string, Family>;
  maxFiles?: number;
  maxDepth?: number;
}): Map<string, Family> {
  const modules: ModuleInfo[] = [];
  const visitedPaths = new Set<string>();
  const visitedEdges = new Set<string>();
  const queue = buildLoads.map((load) => ({ ...load, depth: 0 }));

  while (queue.length > 0 && modules.length < maxFiles) {
    const next = queue.shift();
    if (next == null) break;
    if (next.depth > maxDepth) continue;
    const edge = `${next.fromAbsDir}\0${next.label}`;
    if (visitedEdges.has(edge)) continue;
    visitedEdges.add(edge);
    const module = loadBzl(next.label, next.fromAbsDir);
    if (module == null || visitedPaths.has(module.absPath)) continue;
    visitedPaths.add(module.absPath);

    const loads = parseBazelLoads(module.content);
    const localToExported = new Map<string, string>();
    for (const load of loads)
      for (const symbol of load.symbols)
        localToExported.set(symbol.local, symbol.exported);
    modules.push({
      localToExported,
      defs: parseBazelDefs(module.content).map((def) => ({
        name: def.name,
        tokens: identifierTokens(def.body),
      })),
    });

    const fromAbsDir = dirname(module.absPath);
    for (const load of loads)
      queue.push({ label: load.label, fromAbsDir, depth: next.depth + 1 });
  }

  const family = new Map<string, Family>(Object.entries(seeds));
  for (let changed = true; changed; ) {
    changed = false;
    for (const module of modules)
      for (const def of module.defs) {
        if (family.has(def.name)) continue;
        const resolved = resolveTokens(
          def.tokens,
          module.localToExported,
          family,
        );
        if (resolved != null) {
          family.set(def.name, resolved);
          changed = true;
        }
      }
  }
  return family;
}

function resolveTokens(
  tokens: Set<string>,
  localToExported: Map<string, string>,
  family: Map<string, Family>,
): Family | null {
  for (const token of tokens) {
    const exported = localToExported.get(token) ?? token;
    const resolved = family.get(exported);
    if (resolved != null) return resolved;
  }
  return null;
}

/**
 * Resolve a BUILD rule call to a family: well-known rule, a loaded symbol whose
 * export resolves in the map, or a same-name macro in the map. Otherwise null
 * (the target is not detected).
 */
export function resolveCallRule(
  rule: string,
  buildLocalToExported: Map<string, string>,
  family: Map<string, Family>,
  seeds: Record<string, Family>,
): Family | null {
  if (seeds[rule] != null) return seeds[rule];
  const exported = buildLocalToExported.get(rule) ?? rule;
  return family.get(exported) ?? null;
}
