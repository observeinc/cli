import { posix } from "node:path";
import { parse as parseToml } from "smol-toml";
import type { ProjectSnapshot } from "../snapshot";
import type { DetectedDependency, DependencyScope } from "../types";
import {
  createCandidate,
  detectLockfiles,
  findOwnedProjectFiles,
  projectDirectory,
} from "./common";

function parsePythonDependencies(content: string) {
  return content.split(/\r?\n/).flatMap((line) => {
    const requirement = parseRequirement(line.trim());
    return requirement == null
      ? []
      : [
          {
            ...requirement,
            scope: "runtime" as const,
            optional: false,
            sourceKind: "manifest" as const,
            purl: `pkg:pypi/${requirement.name.toLowerCase()}`,
          },
        ];
  });
}

/**
 * Dependencies from `pyproject.toml` (`[project] dependencies`, optional
 * dependency groups, `[tool.poetry.dependencies]`) and `Pipfile`
 * (`[packages]`, `[dev-packages]`), keeping the version specifier.
 *
 * Two shapes carry a version:
 *   - PEP 621 strings: `"fastapi>=0.100,<1"`, `"requests[security]==2.32.0"`
 *   - Poetry / Pipfile tables: `fastapi = "^0.100"`, `requests = {version = "*"}`
 */
function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseRequirement(requirement: string) {
  const match =
    /^([A-Za-z0-9][A-Za-z0-9_.-]*)(?:\[[^\]]*\])?\s*((?:[=<>~!].*?)?)\s*(?:[;#].*)?$/.exec(
      requirement,
    );
  return match?.[1] == null
    ? null
    : {
        name: match[1],
        version: match[2]?.trim() === "" ? undefined : match[2]?.trim(),
      };
}

function parseStructuredPythonDependencies(content: string) {
  let parsed: Record<string, unknown>;
  try {
    parsed = parseToml(content);
  } catch {
    return [];
  }
  const found = new Map<string, DetectedDependency>();
  const record = (
    name: string,
    raw: unknown,
    scope: DependencyScope = "runtime",
    optional = false,
  ) => {
    if (name === "python") return;
    const table = asRecord(raw);
    const value = typeof raw === "string" ? raw : table?.version;
    const version =
      typeof value === "string" && value !== "*" ? value : undefined;
    found.set(`${name}:${scope}:${String(optional)}`, {
      name,
      version: version == null ? undefined : normalizePoetrySpec(version),
      scope,
      optional,
      sourceKind: "manifest",
      purl: `pkg:pypi/${name.toLowerCase()}`,
    });
  };
  const project = asRecord(parsed.project);
  for (const item of Array.isArray(project?.dependencies)
    ? project.dependencies
    : []) {
    if (typeof item !== "string") continue;
    const requirement = parseRequirement(item);
    if (requirement != null) record(requirement.name, requirement.version);
  }
  const optional = asRecord(project?.["optional-dependencies"]);
  for (const values of Object.values(optional ?? {}))
    for (const item of Array.isArray(values) ? values : []) {
      if (typeof item !== "string") continue;
      const requirement = parseRequirement(item);
      if (requirement != null)
        record(requirement.name, requirement.version, "optional", true);
    }
  const tool = asRecord(parsed.tool);
  const poetry = asRecord(tool?.poetry);
  for (const [name, value] of Object.entries(
    asRecord(poetry?.dependencies) ?? {},
  ))
    record(name, value);
  for (const [groupName, group] of Object.entries(
    asRecord(poetry?.group) ?? {},
  ))
    for (const [name, value] of Object.entries(
      asRecord(asRecord(group)?.dependencies) ?? {},
    ))
      record(name, value, groupName === "main" ? "runtime" : "development");
  for (const section of ["packages", "dev-packages"])
    for (const [name, value] of Object.entries(asRecord(parsed[section]) ?? {}))
      record(name, value, section === "packages" ? "runtime" : "development");

  return [...found.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

/** Poetry `^1.2` / `~1.2` are npm-style; PEP 440 has no caret, so translate. */
function normalizePoetrySpec(spec: string) {
  const caret = /^\^(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(spec.trim());
  if (caret != null) {
    const [, major, minor, patch] = caret;
    const floor = `${major}.${minor ?? "0"}.${patch ?? "0"}`;
    const ceiling =
      major !== "0" || minor == null
        ? `${Number(major) + 1}.0.0`
        : `0.${Number(minor) + 1}.0`;
    return `>=${floor},<${ceiling}`;
  }
  const tilde = /^~(\d+)\.(\d+)(?:\.(\d+))?$/.exec(spec.trim());
  if (tilde != null) {
    const [, major, minor, patch] = tilde;
    return `>=${major}.${minor}.${patch ?? "0"},<${major}.${Number(minor) + 1}.0`;
  }
  return spec.trim();
}

export function detectPython(snapshot: ProjectSnapshot) {
  const manifests = snapshot.files.filter((file) =>
    ["pyproject.toml", "requirements.txt", "Pipfile"].includes(
      posix.basename(file.path),
    ),
  );
  const directories = [
    ...new Set(manifests.map((file) => projectDirectory(file.path))),
  ].sort();
  return directories.flatMap((directory) => {
    const local = manifests.filter(
      (file) => projectDirectory(file.path) === directory,
    );
    const content = local.map((file) => file.content ?? "").join("\n");
    const dependencies = local.flatMap((file) =>
      posix.basename(file.path) === "requirements.txt"
        ? parsePythonDependencies(file.content ?? "")
        : parseStructuredPythonDependencies(file.content ?? ""),
    );
    const projectFiles = findOwnedProjectFiles(snapshot.files, directory, [
      "pyproject.toml",
      "requirements.txt",
      "Pipfile",
    ]);
    const framework = ["django", "fastapi", "flask", "starlette"].filter(
      (name) =>
        new RegExp(`(^|["'\\s])${name}(["'\\s=<>]|$)`, "i").test(content),
    );
    const entrypoint = projectFiles.find((file) =>
      ["manage.py", "app.py", "main.py"].includes(posix.basename(file.path)),
    );
    const hasConsoleScript = local.some((file) => {
      if (
        posix.basename(file.path) !== "pyproject.toml" ||
        file.content == null
      )
        return false;
      try {
        const parsed = parseToml(file.content) as Record<string, unknown>;
        return (
          Object.keys(asRecord(asRecord(parsed.project)?.scripts) ?? {})
            .length > 0 ||
          Object.keys(
            asRecord(asRecord(asRecord(parsed.tool)?.poetry)?.scripts) ?? {},
          ).length > 0
        );
      } catch {
        return false;
      }
    });
    if (!entrypoint && !hasConsoleScript) return [];
    const lockfiles = detectLockfiles({
      files: snapshot.files,
      directory,
      mapping: {
        "poetry.lock": "poetry",
        "uv.lock": "uv",
        "Pipfile.lock": "pipenv",
      },
    });
    const manager = content.includes("[tool.poetry")
      ? "poetry"
      : local.some((file) => posix.basename(file.path) === "Pipfile")
        ? "pipenv"
        : (lockfiles[0]?.manager ?? "pip");
    const pyproject = local.find(
      (file) => posix.basename(file.path) === "pyproject.toml",
    );
    let requiresPython: string | undefined;
    let projectName: string | undefined;
    if (pyproject?.content != null)
      try {
        const parsed = parseToml(pyproject.content) as Record<string, unknown>;
        const project = asRecord(parsed.project);
        const poetry = asRecord(asRecord(parsed.tool)?.poetry);
        const python = asRecord(poetry?.dependencies)?.python;
        projectName =
          typeof project?.name === "string"
            ? project.name
            : typeof poetry?.name === "string"
              ? poetry.name
              : undefined;
        requiresPython =
          typeof project?.["requires-python"] === "string"
            ? project["requires-python"]
            : typeof python === "string"
              ? python
              : undefined;
      } catch {
        requiresPython = undefined;
      }
    return [
      createCandidate({
        directory,
        name:
          projectName ??
          posix.basename(directory === "." ? snapshot.root : directory),
        language: "python",
        runtime: "python",
        version:
          requiresPython == null
            ? undefined
            : normalizePoetrySpec(requiresPython),
        packageManager: {
          id: manager,
          lockfile: lockfiles.find((item) => item.manager === manager)?.path,
          source: manager === "pip" ? "default" : "manifest",
        },
        lockfiles: lockfiles.map((item) => item.path),
        frameworks: framework.map((id) => ({ id })),
        entrypoints: entrypoint ? [{ path: entrypoint.path }] : [],
        dependencies: [
          ...new Map<string, DetectedDependency>(
            dependencies.map((dependency) => [
              `${dependency.name}:${dependency.scope}`,
              dependency,
            ]),
          ).values(),
        ].sort((a, b) => a.name.localeCompare(b.name)),
        evidence: local.map((file) => ({
          kind: "manifest" as const,
          path: file.path,
        })),
      }),
    ];
  });
}
