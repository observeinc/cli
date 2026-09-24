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
          /\b(implementation|api|runtimeOnly|compileOnly|compileOnlyApi|annotationProcessor|kapt|testImplementation|testRuntimeOnly|testCompileOnly)\s*\(?\s*["'][^:"']+:([^:"']+)(?::([^"']+))?["']/g,
        ),
      ].flatMap((match) => {
        const [, configuration = "", name, version] = match;
        return name == null
          ? []
          : [
              {
                name,
                version,
                scope: gradleScope(configuration),
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
      if (isGradleBuildLogic(content)) return null;
      const frameworks = FRAMEWORK_COORDINATES.filter(([, pattern]) =>
        pattern.test(content),
      ).map(([name]) => name);
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
      if (!hasEntrypoint && (frameworks.length === 0 || isLibrary(content)))
        return null;
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

/**
 * Framework coordinates (group IDs, artifact prefixes, plugin IDs, version
 * catalog accessors). Matched case-sensitively against build files so prose
 * such as `description = "Built in Micronaut"` is not evidence.
 */
const FRAMEWORK_COORDINATES: [string, RegExp][] = [
  ["spring-boot", /org\.springframework\.boot|spring-boot-/],
  ["quarkus", /io\.quarkus|quarkus-/],
  ["micronaut", /io\.micronaut|\bmicronaut[.-]/],
];

/** A Gradle build that produces build logic (convention plugins), not an app. */
function isGradleBuildLogic(content: string) {
  return /`kotlin-dsl`|["']kotlin-dsl["']|\bjava-gradle-plugin\b/.test(content);
}

/**
 * A module that declares itself a library and applies no application plugin.
 * Framework dependencies alone do not make it runnable; it still counts when
 * its own sources contain a main entry point.
 */
function isLibrary(content: string) {
  return (
    /\bjava-library\b|\bmicronaut[.-]library\b/.test(content) &&
    !/\bmicronaut[.-]application\b|org\.springframework\.boot|io\.quarkus|["'`]application["'`]|^\s*application\s*$/m.test(
      content,
    )
  );
}

/**
 * Gradle configurations by whether the dependency is on the runtime classpath.
 * `compileOnly` and annotation processors are the Gradle counterparts of
 * Maven's `provided` scope: present at build time only.
 */
function gradleScope(configuration: string): DependencyScope {
  if (configuration.startsWith("test")) return "test";
  if (
    configuration.startsWith("compileOnly") ||
    configuration === "annotationProcessor" ||
    configuration === "kapt"
  )
    return "build";
  return "runtime";
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
  const toolchain =
    /JavaLanguageVersion\.of\(\s*(\d+)\s*\)/.exec(content)?.[1] ??
    /jvmToolchain\(\s*(\d+)\s*\)/.exec(content)?.[1];
  if (toolchain != null) return toolchain;
  // VERSION_1_8 is the legacy spelling of Java 8; keep it as "1.8" so the
  // runtime normalizer maps it to 8 rather than reading a bare "1".
  const constant = /JavaVersion\.VERSION_(\d+)(?:_(\d+))?/.exec(content);
  if (constant?.[1] != null)
    return constant[2] == null ? constant[1] : `${constant[1]}.${constant[2]}`;
  return /sourceCompatibility\s*=?\s*['"]?(\d+(?:\.\d+)?)/.exec(content)?.[1];
}
