import { posix } from "node:path";
import type { SnapshotFile } from "./snapshot";
import type { Evidence, LanguageId } from "./types";
import { findLocalFiles } from "./detectors/common";

/**
 * Version files and Docker base images that declare a runtime version when the
 * package manifest does not. Precedence is decided by the caller: a manifest
 * declaration wins, then a version file, then a Dockerfile `FROM` tag.
 */
const VERSION_FILES: Partial<Record<LanguageId, string[]>> = {
  nodejs: [".nvmrc", ".node-version"],
  ruby: [".ruby-version"],
  python: [".python-version", "runtime.txt"],
  java: [".java-version", ".sdkmanrc"],
};

/** `.tool-versions` (asdf / mise) plugin names per runtime. */
const TOOL_VERSIONS_KEYS: Partial<Record<LanguageId, string[]>> = {
  nodejs: ["nodejs", "node"],
  ruby: ["ruby"],
  python: ["python"],
  java: ["java"],
  dotnet: ["dotnet", "dotnet-core"],
  go: ["golang", "go"],
  rust: ["rust"],
  erlang: ["erlang", "elixir"],
  php: ["php"],
};

/** Docker Hub / MCR image names whose tag is the runtime version. */
const DOCKER_IMAGES: Partial<Record<LanguageId, RegExp>> = {
  nodejs: /^(?:docker\.io\/)?(?:library\/)?node$/,
  ruby: /^(?:docker\.io\/)?(?:library\/)?ruby$/,
  python: /^(?:docker\.io\/)?(?:library\/)?python$/,
  java: /^(?:docker\.io\/)?(?:library\/)?(?:eclipse-temurin|openjdk|amazoncorretto|ibm-semeru-runtimes)$/,
  dotnet: /^mcr\.microsoft\.com\/dotnet\/(?:aspnet|runtime|sdk)$/,
  go: /^(?:docker\.io\/)?(?:library\/)?golang$/,
  php: /^(?:docker\.io\/)?(?:library\/)?php$/,
};

export interface RuntimeVersionEvidence {
  version: string;
  evidence: Evidence;
}

function firstLine(content: string) {
  return (
    content
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !line.startsWith("#")) ?? ""
  );
}

function cleanVersion(runtime: LanguageId, raw: string) {
  let value = raw.trim();
  // `.sdkmanrc`: `java=17.0.2-tem`
  value = value.replace(/^java=/, "");
  // runtime.txt / .ruby-version prefixes and vendor suffixes
  value = value.replace(/^(?:python|ruby|node|jruby)-/i, "");
  if (runtime === "java") value = value.replace(/-[a-z]+$/i, "");
  value = value.replace(/^v(?=\d)/, "");
  // Docker tag variants: 22-alpine, 3.11-slim-bookworm, 17-jre, 8.0-jammy
  value = value.replace(/^(\d+(?:\.\d+){0,2})[-_].*$/, "$1");
  return /^\d/.test(value) ? value : null;
}

/**
 * Find a runtime version for a candidate directory from version files,
 * `.tool-versions`, or a Dockerfile `FROM` line. Returns null when none of
 * those carry a recognizable version for the runtime.
 */
export function detectRuntimeVersion({
  files,
  directory,
  runtime,
}: {
  files: SnapshotFile[];
  directory: string;
  runtime: LanguageId;
}): RuntimeVersionEvidence | null {
  const local = findLocalFiles(files, directory);
  const byName = new Map(
    local.map((file) => [posix.basename(file.path), file]),
  );

  for (const name of VERSION_FILES[runtime] ?? []) {
    const file = byName.get(name);
    if (file?.content == null) continue;
    const version = cleanVersion(runtime, firstLine(file.content));
    if (version != null)
      return {
        version,
        evidence: { kind: "runtime-version", path: file.path, value: version },
      };
  }

  const toolVersions = byName.get(".tool-versions");
  if (toolVersions?.content != null) {
    const keys = TOOL_VERSIONS_KEYS[runtime] ?? [];
    for (const line of toolVersions.content.split("\n")) {
      const [tool, value] = line.trim().split(/\s+/);
      if (tool == null || value == null || !keys.includes(tool)) continue;
      const version = cleanVersion(runtime, value);
      if (version != null)
        return {
          version,
          evidence: {
            kind: "runtime-version",
            path: toolVersions.path,
            key: tool,
            value: version,
          },
        };
    }
  }

  const dockerfile =
    byName.get("Dockerfile") ??
    local.find((file) => /(^|\/)Dockerfile(\.[^/]+)?$/.test(file.path));
  if (dockerfile?.content != null) {
    const pattern = DOCKER_IMAGES[runtime];
    if (pattern != null)
      for (const match of dockerfile.content.matchAll(
        /^\s*FROM\s+(?:--platform=\S+\s+)?([^\s:@]+)(?::([^\s@]+))?/gim,
      )) {
        const [, image, tag] = match;
        if (image == null || tag == null || !pattern.test(image)) continue;
        const version = cleanVersion(runtime, tag);
        if (version != null)
          return {
            version,
            evidence: {
              kind: "runtime-version",
              path: dockerfile.path,
              key: "FROM",
              value: `${image}:${tag}`,
            },
          };
      }
  }

  return null;
}
