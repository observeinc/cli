import { posix } from "node:path";
import type { ProjectSnapshot } from "../snapshot";
import { createCandidate, projectDirectory } from "./common";
import type { DetectedDependency } from "../types";
import { fileAt, joinPath } from "../file-index";

export function detectRuby(snapshot: ProjectSnapshot) {
  return snapshot.files
    .filter((file) => posix.basename(file.path) === "Gemfile")
    .map((manifest) => {
      const directory = projectDirectory(manifest.path);
      const content = manifest.content ?? "";
      const dependencies = parseGemfile(content);
      const lockfile = fileAt(
        snapshot.files,
        joinPath(directory, "Gemfile.lock"),
      );
      const rails = dependencies.find(
        (dependency) => dependency.name === "rails",
      );
      const rack = dependencies.some(
        (dependency) => dependency.name === "rack",
      );
      const hasEntrypoint = ["config.ru", "bin/rails"].some(
        (path) => fileAt(snapshot.files, joinPath(directory, path)) != null,
      );
      if (!rails && !rack && !hasEntrypoint) return null;
      return createCandidate({
        directory,
        name: posix.basename(directory === "." ? snapshot.root : directory),
        language: "ruby",
        runtime: "ruby",
        packageManager: {
          id: "bundler",
          lockfile: lockfile ? "Gemfile.lock" : undefined,
          source: "manifest",
        },
        lockfiles: lockfile ? ["Gemfile.lock"] : [],
        frameworks: rails
          ? [{ id: "rails", version: rails.version }]
          : rack
            ? [{ id: "rack" }]
            : [],
        entrypoints: [
          {
            path: "Gemfile",
            command: rails ? "bundle exec rails server" : undefined,
          },
        ],
        dependencies,
        evidence: [{ kind: "manifest", path: manifest.path }],
      });
    })
    .filter((candidate) => candidate != null);
}

/** Bundler groups that never load in a production process. */
const NON_RUNTIME_GROUPS = new Set(["development", "test"]);

function groupNames(text: string) {
  return [...text.matchAll(/:(\w+)|["'](\w+)["']/g)].flatMap((match) => {
    const name = match[1] ?? match[2];
    return name == null ? [] : [name];
  });
}

function scopeForGroups(groups: string[]): DetectedDependency["scope"] {
  if (groups.length === 0 || groups.some((g) => !NON_RUNTIME_GROUPS.has(g)))
    return "runtime";
  return groups.every((group) => group === "test") ? "test" : "development";
}

/**
 * Gem declarations from a Gemfile with every version constraint and the
 * Bundler groups that apply, from both `group ... do` blocks and inline
 * `group:` / `groups:` options. A gem only in development/test groups is not
 * a runtime dependency. Other blocks (`platforms`, `source`, `if`) are tracked
 * only so their `end` does not close an enclosing group.
 */
function parseGemfile(content: string): DetectedDependency[] {
  const dependencies: DetectedDependency[] = [];
  const blocks: string[][] = [];
  for (const line of content.split("\n")) {
    const code = line.replace(/#.*$/, "");
    const group = /^\s*group\b(.*?)\bdo\b/.exec(code);
    if (group?.[1] != null) {
      blocks.push(groupNames(group[1]));
      continue;
    }
    if (/^\s*end\b/.test(code)) {
      blocks.pop();
      continue;
    }
    const gem = /^\s*gem\s*\(?\s*["']([^"']+)["'](.*)$/.exec(code);
    if (gem?.[1] == null) {
      if (
        /\bdo\s*(\|[^|]*\|)?\s*$/.test(code) ||
        /^\s*(?:if|unless|case|begin|while|until|def)\b/.test(code)
      )
        blocks.push([]);
      continue;
    }
    const [, name, rest = ""] = gem;
    const constraints: string[] = [];
    let remainder = rest;
    for (;;) {
      const next = /^\s*,\s*["']([^"']*)["']/.exec(remainder);
      if (next?.[1] == null) break;
      constraints.push(next[1].trim());
      remainder = remainder.slice(next[0].length);
    }
    const inline = /\bgroups?\s*:\s*(\[[^\]]*\]|:\w+|["']\w+["'])/.exec(
      remainder,
    )?.[1];
    const groups = [
      ...blocks.flat(),
      ...(inline == null ? [] : groupNames(inline)),
    ];
    dependencies.push({
      name,
      version: constraints.length === 0 ? undefined : constraints.join(", "),
      scope: scopeForGroups(groups),
      optional: false,
      sourceKind: "manifest",
      purl: `pkg:gem/${name}`,
    });
  }
  return dependencies;
}
