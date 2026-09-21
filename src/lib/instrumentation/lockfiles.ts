import { posix } from "node:path";
import { parse as parseToml } from "smol-toml";
import { parse as parseYaml } from "yaml";
import type { SnapshotFile } from "./snapshot";
import type { DetectedDependency } from "./types";
import { findLocalFiles, relativeToProject } from "./detectors/common";

/** Resolved versions keyed by normalized package name. */
export type ResolvedVersions = Map<string, string>;

export const LOCKFILE_BASENAMES = new Set([
  "package-lock.json",
  "npm-shrinkwrap.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "Gemfile.lock",
  "poetry.lock",
  "uv.lock",
  "Pipfile.lock",
  "packages.lock.json",
  "composer.lock",
]);

export function normalizePackageName(name: string) {
  return name.trim().toLowerCase().replace(/_/g, "-");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : null;
}

function safeJson(content: string): Record<string, unknown> | null {
  try {
    return asRecord(JSON.parse(content));
  } catch {
    return null;
  }
}

/**
 * Parse a lockfile into direct-dependency resolved versions. Returns null when
 * the content is not a recognized shape, so the caller can report it and fall
 * back to manifest ranges. Transitive entries are included where the format
 * does not distinguish them; the caller only looks up names it declared.
 */
export function parseLockfile({
  basename,
  content,
}: {
  basename: string;
  content: string;
}): ResolvedVersions | null {
  switch (basename) {
    case "package-lock.json":
    case "npm-shrinkwrap.json":
      return parseNpmLock(content);
    case "pnpm-lock.yaml":
      return parsePnpmLock(content);
    case "yarn.lock":
      return parseYarnLock(content);
    case "Gemfile.lock":
      return parseGemfileLock(content);
    case "poetry.lock":
    case "uv.lock":
      return parseTomlPackages(content);
    case "Pipfile.lock":
      return parsePipfileLock(content);
    case "packages.lock.json":
      return parseNugetLock(content);
    case "composer.lock":
      return parseComposerLock(content);
    default:
      return null;
  }
}

function parseNpmLock(content: string): ResolvedVersions | null {
  const json = safeJson(content);
  if (json == null) return null;
  const resolved: ResolvedVersions = new Map();
  const packages = asRecord(json.packages);
  if (packages != null) {
    // v2 / v3: keys are install paths; a direct dependency lives at
    // `node_modules/<name>` (nested copies are deeper and skipped).
    for (const [path, entry] of Object.entries(packages)) {
      const match = /^node_modules\/((?:@[^/]+\/)?[^/]+)$/.exec(path);
      const version = asRecord(entry)?.version;
      if (match?.[1] != null && typeof version === "string")
        resolved.set(normalizePackageName(match[1]), version);
    }
    return resolved;
  }
  const dependencies = asRecord(json.dependencies);
  if (dependencies == null) return null;
  for (const [name, entry] of Object.entries(dependencies)) {
    const version = asRecord(entry)?.version;
    if (typeof version === "string")
      resolved.set(normalizePackageName(name), version);
  }
  return resolved;
}

function parsePnpmLock(content: string): ResolvedVersions | null {
  try {
    const root = asRecord(parseYaml(content));
    if (root?.lockfileVersion == null) return null;
    return pnpmImporterVersions({ root, importer: "." });
  } catch {
    return null;
  }
}

/** Resolve one pnpm workspace importer from a parsed v5-v9 lockfile. */
export function pnpmImporterVersions({
  root,
  importer,
}: {
  root: Record<string, unknown>;
  importer: string;
}) {
  const importers = asRecord(root.importers);
  const selected = importers == null ? root : asRecord(importers[importer]);
  const resolved: ResolvedVersions = new Map();
  if (selected == null) return resolved;
  for (const section of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
  ]) {
    const entries = asRecord(selected[section]);
    if (entries == null) continue;
    for (const [name, raw] of Object.entries(entries)) {
      const record = asRecord(raw);
      const version =
        record == null ? stringValue(raw) : stringValue(record.version);
      if (version != null)
        resolved.set(normalizePackageName(name), stripPeerSuffix(version));
    }
  }
  return resolved;
}

function stripPeerSuffix(version: string) {
  return version
    .replace(/^['"]|['"]$/g, "")
    .replace(/\(.*$/, "")
    .trim();
}

function parseYarnLock(content: string): ResolvedVersions | null {
  if (!/^#\s*yarn lockfile v1|^__metadata:/m.test(content)) return null;
  const resolved: ResolvedVersions = new Map();
  const blocks = content.split(/\n(?=\S)/);
  for (const block of blocks) {
    const [header, ...body] = block.split("\n");
    if (!header?.trimEnd().endsWith(":")) continue;
    const versionLine = body.find((line) => /^\s+version:?\s/.test(line));
    const version = versionLine
      ? /version:?\s+["']?([^"'\s]+)/.exec(versionLine)?.[1]
      : undefined;
    if (version == null) continue;
    for (const selector of header.replace(/:\s*$/, "").split(",")) {
      const cleaned = selector.trim().replace(/^["']|["']$/g, "");
      const name = /^((?:@[^/]+\/)?[^@]+)@/.exec(cleaned)?.[1];
      if (name != null) resolved.set(normalizePackageName(name), version);
    }
  }
  return resolved;
}

function parseGemfileLock(content: string): ResolvedVersions | null {
  if (!/^\s*specs:/m.test(content)) return null;
  const resolved: ResolvedVersions = new Map();
  // Direct and transitive gems both appear under `specs:`; direct ones are
  // indented four spaces, their dependencies six. Take the four-space lines.
  for (const match of content.matchAll(/^ {4}([^\s(]+) \(([^)]+)\)$/gm)) {
    const [, name, version] = match;
    if (name != null && version != null)
      resolved.set(
        normalizePackageName(name),
        version.split("-")[0] ?? version,
      );
  }
  return resolved;
}

function parseTomlPackages(content: string): ResolvedVersions | null {
  try {
    const parsed = asRecord(parseToml(content));
    if (parsed == null || !Array.isArray(parsed.package)) return null;
    const resolved: ResolvedVersions = new Map();
    for (const raw of parsed.package) {
      const pkg = asRecord(raw);
      if (typeof pkg?.name === "string" && typeof pkg.version === "string")
        resolved.set(normalizePackageName(pkg.name), pkg.version);
    }
    return resolved;
  } catch {
    return null;
  }
}

function parsePipfileLock(content: string): ResolvedVersions | null {
  const json = safeJson(content);
  if (json == null || asRecord(json._meta) == null) return null;
  const resolved: ResolvedVersions = new Map();
  for (const section of ["default", "develop"]) {
    const entries = asRecord(json[section]);
    if (entries == null) continue;
    for (const [name, entry] of Object.entries(entries)) {
      const version = asRecord(entry)?.version;
      if (typeof version === "string")
        resolved.set(normalizePackageName(name), version.replace(/^==/, ""));
    }
  }
  return resolved;
}

function parseNugetLock(content: string): ResolvedVersions | null {
  const json = safeJson(content);
  const frameworks = json == null ? null : asRecord(json.dependencies);
  if (frameworks == null) return null;
  const resolved: ResolvedVersions = new Map();
  for (const entries of Object.values(frameworks)) {
    const packages = asRecord(entries);
    if (packages == null) continue;
    for (const [name, entry] of Object.entries(packages)) {
      const record = asRecord(entry);
      const version = record?.resolved;
      if (typeof version === "string" && record?.type !== "Transitive")
        resolved.set(normalizePackageName(name), version);
    }
  }
  return resolved;
}

function parseComposerLock(content: string): ResolvedVersions | null {
  const json = safeJson(content);
  if (json == null || !Array.isArray(json.packages)) return null;
  const resolved: ResolvedVersions = new Map();
  for (const section of ["packages", "packages-dev"]) {
    const list = json[section];
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      const record = asRecord(entry);
      if (
        typeof record?.name === "string" &&
        typeof record.version === "string"
      )
        resolved.set(
          normalizePackageName(record.name),
          record.version.replace(/^v(?=\d)/, ""),
        );
    }
  }
  return resolved;
}

/**
 * Locate and parse the lockfiles in a candidate directory. Returns the merged
 * resolved versions plus the relative paths of any lockfile that could not be
 * parsed, so the detector can raise a diagnostic and fall back to ranges.
 */
export function resolveFromLockfiles({
  files,
  directory,
  basenames,
}: {
  files: SnapshotFile[];
  directory: string;
  basenames: Iterable<string>;
}) {
  const wanted = new Set(basenames);
  const resolved: ResolvedVersions = new Map();
  const unparseable: string[] = [];
  const parsed: string[] = [];
  for (const file of findLocalFiles(files, directory)) {
    const basename = posix.basename(file.path);
    if (!wanted.has(basename)) continue;
    const relativePath = relativeToProject(file.path, directory);
    if (file.content == null) {
      unparseable.push(relativePath);
      continue;
    }
    const versions = parseLockfile({ basename, content: file.content });
    if (versions == null) {
      unparseable.push(relativePath);
      continue;
    }
    parsed.push(relativePath);
    for (const [name, version] of versions)
      if (!resolved.has(name)) resolved.set(name, version);
  }
  return { resolved, parsed, unparseable };
}

/** Resolve one importer from a pnpm workspace lockfile. */
export function resolvePnpmImporter({
  content,
  importer,
}: {
  content: string;
  importer: string;
}): ResolvedVersions | null {
  try {
    const root = asRecord(parseYaml(content));
    if (root?.lockfileVersion == null) return null;
    return pnpmImporterVersions({ root, importer });
  } catch {
    return null;
  }
}

/** Attach lockfile-resolved versions to declared dependencies. */
export function applyResolvedVersions(
  dependencies: DetectedDependency[],
  resolved: ResolvedVersions,
) {
  if (resolved.size === 0) return dependencies;
  return dependencies.map((dependency) => {
    const version = resolved.get(normalizePackageName(dependency.name));
    return version == null
      ? dependency
      : {
          ...dependency,
          resolvedVersion: version,
          sourceKind: "lockfile" as const,
        };
  });
}
