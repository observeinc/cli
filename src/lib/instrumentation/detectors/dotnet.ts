import { posix } from "node:path";
import type { ProjectSnapshot } from "../snapshot";
import { createCandidate, projectDirectory } from "./common";
import { fileAt, joinPath } from "../file-index";

/** Visual Studio's project type GUID for an ASP.NET (.NET Framework) web application. */
const WEB_APPLICATION_PROJECT_TYPE = "349c5851-65df-11da-9384-00065b846f21";

export function detectDotnet(snapshot: ProjectSnapshot) {
  return snapshot.files
    .filter((file) => file.path.endsWith(".csproj"))
    .flatMap((manifest) => {
      const directory = projectDirectory(manifest.path);
      const content = manifest.content ?? "";
      if (isTestProject(content)) return [];
      const packagesConfig = fileAt(
        snapshot.files,
        joinPath(directory, "packages.config"),
      );
      const packages = [
        ...packageReferences(content),
        ...packagesConfigEntries(packagesConfig?.content ?? ""),
      ];
      const classicWeb = isClassicWebApplication({
        content,
        hasGlobalAsax:
          fileAt(snapshot.files, joinPath(directory, "Global.asax")) != null,
      });
      const framework = /Microsoft\.NET\.Sdk\.Web|AspNetCore/i.test(content)
        ? "aspnet-core"
        : classicWeb
          ? "aspnet"
          : /Worker/i.test(content)
            ? "worker-service"
            : undefined;
      const program = fileAt(snapshot.files, joinPath(directory, "Program.cs"));
      if (!classicWeb && !isRunnable(content, program != null)) return [];
      const candidate = createCandidate({
        directory,
        name: posix.basename(manifest.path, ".csproj"),
        language: "dotnet",
        runtime: "dotnet",
        version:
          /<TargetFrameworks?>([^<]+)<\/TargetFrameworks?>/.exec(
            content,
          )?.[1] ??
          /<TargetFrameworkVersion>\s*([^<]+?)\s*<\/TargetFrameworkVersion>/.exec(
            content,
          )?.[1],
        packageManager: { id: "dotnet", source: "manifest" },
        frameworks: framework ? [{ id: framework }] : [],
        entrypoints: [
          { path: manifest.path },
          ...(program ? [{ path: program.path, command: "dotnet run" }] : []),
        ],
        dependencies: [
          ...(framework === "aspnet-core"
            ? [
                {
                  name: "Microsoft.AspNetCore.App",
                  scope: "runtime" as const,
                  optional: false,
                  sourceKind: "framework-reference" as const,
                  purl: "pkg:nuget/Microsoft.AspNetCore.App",
                },
              ]
            : []),
          ...packages,
        ],
        evidence: [
          { kind: "manifest", path: manifest.path },
          ...(packagesConfig
            ? [{ kind: "manifest" as const, path: packagesConfig.path }]
            : []),
        ],
      });
      return [candidate];
    });
}

/**
 * SDK-style `<PackageReference>` items. Match the whole tag, then pull
 * Include/Version out of its attributes so attribute order and spacing don't
 * drop the version.
 */
function packageReferences(content: string) {
  return [
    ...content.matchAll(
      /<PackageReference\b([^>]*?)(?:\/>|>([\s\S]*?)<\/PackageReference>)/gi,
    ),
  ].flatMap((match) => {
    const attributes = match[1] ?? "";
    const name = /Include=["']([^"']+)["']/i.exec(attributes)?.[1];
    if (name == null) return [];
    return [
      nugetDependency({
        name,
        version:
          /Version=["']([^"']+)["']/i.exec(attributes)?.[1] ??
          /<Version>\s*([^<]+)\s*<\/Version>/i
            .exec(match[2] ?? "")?.[1]
            ?.trim(),
      }),
    ];
  });
}

/**
 * Legacy `packages.config` entries. Development-only packages (build tools,
 * analyzers) are not runtime dependencies.
 */
function packagesConfigEntries(content: string) {
  return [...content.matchAll(/<package\b([^>]*?)\/?>/gi)].flatMap((match) => {
    const attributes = match[1] ?? "";
    const name = /\bid=["']([^"']+)["']/i.exec(attributes)?.[1];
    if (
      name == null ||
      /\bdevelopmentDependency=["']true["']/i.test(attributes)
    )
      return [];
    return [
      nugetDependency({
        name,
        version: /\bversion=["']([^"']+)["']/i.exec(attributes)?.[1],
      }),
    ];
  });
}

function nugetDependency({
  name,
  version,
}: {
  name: string;
  version: string | undefined;
}) {
  return {
    name,
    version,
    scope: "runtime" as const,
    optional: false,
    sourceKind: "manifest" as const,
    purl: `pkg:nuget/${name}`,
  };
}

/** A test project, per MSBuild: it runs under a test host, not as a service. */
function isTestProject(content: string) {
  return (
    /<IsTestProject>\s*true\s*<\/IsTestProject>/i.test(content) ||
    /<PackageReference\b[^>]*Include=["']Microsoft\.NET\.Test\.Sdk["']/i.test(
      content,
    )
  );
}

/**
 * An ASP.NET (.NET Framework) web application. It builds as a class library
 * that IIS hosts, so it has no executable `OutputType` or `Program.cs`; the
 * web application project type or a `Global.asax` marks it as runnable.
 */
function isClassicWebApplication({
  content,
  hasGlobalAsax,
}: {
  content: string;
  hasGlobalAsax: boolean;
}) {
  const projectTypes =
    /<ProjectTypeGuids>([^<]*)<\/ProjectTypeGuids>/i.exec(content)?.[1] ?? "";
  return (
    hasGlobalAsax ||
    projectTypes.toLowerCase().includes(WEB_APPLICATION_PROJECT_TYPE)
  );
}

/**
 * Whether the project builds something that runs: a Web or Worker SDK
 * project, an explicit executable `OutputType`, or a `Program.cs` entry
 * point. A plain `Microsoft.NET.Sdk` project without these is a class library.
 */
function isRunnable(content: string, hasProgram: boolean) {
  return (
    hasProgram ||
    /Sdk=["']Microsoft\.NET\.Sdk\.(?:Web|Worker)["']/i.test(content) ||
    /<OutputType>\s*(?:Exe|WinExe)\s*<\/OutputType>/i.test(content)
  );
}
