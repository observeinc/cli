import { posix } from "node:path";
import type { ProjectSnapshot } from "../snapshot";
import { createCandidate, projectDirectory } from "./common";

export function detectRuby(snapshot: ProjectSnapshot) {
  return snapshot.files
    .filter((file) => posix.basename(file.path) === "Gemfile")
    .map((manifest) => {
      const directory = projectDirectory(manifest.path);
      const content = manifest.content ?? "";
      const dependencies = [
        ...content.matchAll(
          /^\s*gem\s+["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?/gm,
        ),
      ].flatMap((match) => {
        const name = match[1];
        return name == null
          ? []
          : [
              {
                name,
                version: match[2],
                scope: "runtime" as const,
                optional: false,
                sourceKind: "manifest" as const,
                purl: `pkg:gem/${name}`,
              },
            ];
      });
      const lockfile = snapshot.files.find(
        (file) =>
          file.path ===
          (directory === "." ? "Gemfile.lock" : `${directory}/Gemfile.lock`),
      );
      const rails = dependencies.find(
        (dependency) => dependency.name === "rails",
      );
      const rack = dependencies.some(
        (dependency) => dependency.name === "rack",
      );
      const hasEntrypoint = snapshot.files.some((file) =>
        [
          directory === "." ? "config.ru" : `${directory}/config.ru`,
          directory === "." ? "bin/rails" : `${directory}/bin/rails`,
        ].includes(file.path),
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
