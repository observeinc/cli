import { posix } from "node:path";
import type { ProjectSnapshot } from "../snapshot";
import type { DependencyScope } from "../types";
import {
  createCandidate,
  findOwnedProjectFiles,
  projectDirectory,
} from "./common";

export function detectJava(snapshot: ProjectSnapshot) {
  return snapshot.files
    .filter((file) =>
      ["pom.xml", "build.gradle", "build.gradle.kts"].includes(
        posix.basename(file.path),
      ),
    )
    .map((manifest) => {
      const directory = projectDirectory(manifest.path);
      const content = manifest.content ?? "";
      const properties = mavenProperties(content);
      const resolveProperty = (value: string | undefined) =>
        value == null
          ? undefined
          : value.replace(
              /\$\{([^}]+)\}/g,
              (whole, key: string) => properties.get(key) ?? whole,
            );
      const mavenDependencies = [
        ...content
          .replace(/<!--[\s\S]*?-->/g, "")
          .replace(
            /<(dependencyManagement|build|reporting|profiles)\b[^>]*>[\s\S]*?<\/\1>/gi,
            "",
          )
          .matchAll(/<dependency\b[^>]*>([\s\S]*?)<\/dependency>/gi),
      ].flatMap((match) => {
        const block = match[1] ?? "";
        const name = /<artifactId>([^<]+)<\/artifactId>/.exec(block)?.[1];
        const version = resolveProperty(
          /<version>([^<]+)<\/version>/.exec(block)?.[1],
        );
        const declaredScope = /<scope>([^<]+)<\/scope>/
          .exec(block)?.[1]
          ?.trim();
        const scope: DependencyScope =
          declaredScope === "test"
            ? "test"
            : declaredScope === "provided" || declaredScope === "system"
              ? "build"
              : "runtime";
        return name == null
          ? []
          : [
              {
                name,
                // An unresolved `${...}` is not a version; leave it undefined.
                version:
                  version != null && !version.includes("${")
                    ? version
                    : undefined,
                scope,
                optional: /<optional>\s*true\s*<\/optional>/.test(block),
                sourceKind: "manifest" as const,
                purl: `pkg:maven/`,
              },
            ];
      });
      const gradleDependencies = [
        ...content.matchAll(
          /(?:implementation|api|runtimeOnly|compileOnly)\s*\(?["'][^:"']+:([^:"']+)(?::([^"']+))?["']/g,
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
                purl: `pkg:maven/`,
              },
            ];
      });
      const dependencies = [
        ...new Map(
          [...mavenDependencies, ...gradleDependencies].map((dependency) => [
            dependency.name,
            dependency,
          ]),
        ).values(),
      ].sort((left, right) => left.name.localeCompare(right.name));
      const frameworks = ["spring-boot", "quarkus", "micronaut"].filter(
        (name) => content.toLowerCase().includes(name),
      );
      const projectFiles = findOwnedProjectFiles(snapshot.files, directory, [
        "pom.xml",
        "build.gradle",
        "build.gradle.kts",
      ]);
      const hasEntrypoint = projectFiles.some(
        (file) =>
          /src\/main\/java\/.+\.java$/.test(file.path) &&
          /@SpringBootApplication|public\s+static\s+void\s+main/.test(
            file.content ?? "",
          ),
      );
      if (frameworks.length === 0 && !hasEntrypoint) return null;
      return createCandidate({
        directory,
        idSuffix: posix.basename(manifest.path),
        name:
          /<artifactId>([^<]+)<\/artifactId>/.exec(content)?.[1] ??
          posix.basename(directory === "." ? snapshot.root : directory),
        language: "java",
        runtime: "jvm",
        version: javaVersion(content, properties),
        packageManager: {
          id: posix.basename(manifest.path) === "pom.xml" ? "maven" : "gradle",
          source: "manifest",
        },
        frameworks: frameworks.map((id) => ({ id })),
        dependencies,
        evidence: [{ kind: "manifest", path: manifest.path }],
      });
    })
    .filter((candidate) => candidate != null);
}

/** `<properties>` from a pom.xml as a name → value map. */
function mavenProperties(content: string) {
  const block =
    /<properties>([\s\S]*?)<\/properties>/i.exec(content)?.[1] ?? "";
  const properties = new Map<string, string>();
  for (const match of block.matchAll(/<([A-Za-z0-9_.-]+)>([^<]*)<\/\1>/g)) {
    const [, key, value] = match;
    if (key != null && value != null) properties.set(key, value.trim());
  }
  return properties;
}

/**
 * The Java release the build targets: Maven `java.version` /
 * `maven.compiler.release|source|target`, or Gradle `sourceCompatibility`,
 * `JavaVersion.VERSION_x`, or a toolchain `JavaLanguageVersion.of(x)`.
 */
function javaVersion(content: string, properties: Map<string, string>) {
  for (const key of [
    "java.version",
    "maven.compiler.release",
    "maven.compiler.source",
    "maven.compiler.target",
    "target.java.version",
  ]) {
    const value = properties.get(key);
    if (value != null && /^\d/.test(value)) return value;
  }
  const gradle =
    /JavaLanguageVersion\.of\(\s*(\d+)\s*\)/.exec(content)?.[1] ??
    /JavaVersion\.VERSION_(\d+)(?:_(\d+))?/.exec(content)?.[1] ??
    /sourceCompatibility\s*=?\s*['"]?(\d+(?:\.\d+)?)/.exec(content)?.[1];
  return gradle ?? undefined;
}
