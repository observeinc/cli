import { posix } from "node:path";
import type { ProjectSnapshot } from "../snapshot";
import {
  createCandidate,
  projectDirectory,
  safeJson,
  scopedDependencies,
} from "./common";
import { fileAt, joinPath } from "../file-index";

const FRAMEWORKS = [
  "laravel/framework",
  "symfony/http-kernel",
  "symfony/framework-bundle",
  "slim/slim",
  "laminas/laminas-mvc",
  "cakephp/cakephp",
  "yiisoft/yii2",
];

/**
 * PHP applications declared by `composer.json`. The `php` entry in `require`
 * is the runtime version constraint; `composer.lock` supplies resolved
 * versions via the shared lockfile step.
 */
export function detectPhp(snapshot: ProjectSnapshot) {
  return snapshot.files
    .filter((file) => posix.basename(file.path) === "composer.json")
    .flatMap((manifest) => {
      const json = safeJson(manifest.content);
      if (json == null) return [];
      const directory = projectDirectory(manifest.path);
      const require =
        typeof json.require === "object" && json.require
          ? (json.require as Record<string, unknown>)
          : {};
      const { php, ...libraries } = require;
      const dependencies = [
        ...scopedDependencies({ entries: libraries, scope: "runtime" }),
        ...scopedDependencies({
          entries:
            typeof json["require-dev"] === "object" ? json["require-dev"] : {},
          scope: "development",
        }),
      ]
        // Composer platform packages (ext-*, lib-*) are not libraries.
        .filter((dependency) => !/^(?:ext|lib)-/.test(dependency.name))
        .map((dependency) => ({
          ...dependency,
          purl: `pkg:composer/${dependency.name}`,
        }));
      const frameworks = FRAMEWORKS.filter((name) =>
        dependencies.some(
          (dependency) =>
            dependency.scope === "runtime" && dependency.name === name,
        ),
      );
      const entrypoint = ["public/index.php", "index.php", "artisan"]
        .map((path) => fileAt(snapshot.files, joinPath(directory, path)))
        .find((file) => file != null);
      if (frameworks.length === 0 && entrypoint == null) return [];
      const lockfile =
        fileAt(snapshot.files, joinPath(directory, "composer.lock")) != null;
      return [
        createCandidate({
          directory,
          name:
            typeof json.name === "string"
              ? json.name
              : posix.basename(directory === "." ? snapshot.root : directory),
          language: "php",
          runtime: "php",
          version: typeof php === "string" ? php : undefined,
          packageManager: {
            id: "composer",
            lockfile: lockfile ? "composer.lock" : undefined,
            source: "manifest",
          },
          lockfiles: lockfile ? ["composer.lock"] : [],
          frameworks: frameworks.map((id) => ({
            id,
            version: dependencies.find((d) => d.name === id)?.version,
          })),
          entrypoints: entrypoint ? [{ path: entrypoint.path }] : [],
          dependencies,
          evidence: [{ kind: "manifest", path: manifest.path }],
        }),
      ];
    });
}
