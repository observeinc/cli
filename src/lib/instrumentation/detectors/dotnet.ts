import { posix } from "node:path";
import type { ProjectSnapshot } from "../snapshot";
import { createCandidate, projectDirectory } from "./common";

export function detectDotnet(snapshot: ProjectSnapshot) {
  return snapshot.files
    .filter((file) => file.path.endsWith(".csproj"))
    .map((manifest) => {
      const directory = projectDirectory(manifest.path);
      const content = manifest.content ?? "";
      // Match the whole <PackageReference> tag, then pull Include/Version out of
      // its attributes so attribute order and spacing don't drop the version.
      const packages = [
        ...content.matchAll(
          /<PackageReference\b([^>]*?)(?:\/>|>([\s\S]*?)<\/PackageReference>)/gi,
        ),
      ].flatMap((match) => {
        const attributes = match[1] ?? "";
        const name = /Include=["']([^"']+)["']/i.exec(attributes)?.[1];
        if (name == null) return [];
        return [
          {
            name,
            version:
              /Version=["']([^"']+)["']/i.exec(attributes)?.[1] ??
              /<Version>\s*([^<]+)\s*<\/Version>/i
                .exec(match[2] ?? "")?.[1]
                ?.trim(),
            scope: "runtime" as const,
            optional: false,
            sourceKind: "manifest" as const,
            purl: `pkg:nuget/${name}`,
          },
        ];
      });
      const framework = /Microsoft\.NET\.Sdk\.Web|AspNetCore/i.test(content)
        ? "aspnet-core"
        : /Worker/i.test(content)
          ? "worker-service"
          : undefined;
      const program = snapshot.files.find(
        (file) =>
          file.path ===
          (directory === "." ? "Program.cs" : `${directory}/Program.cs`),
      );
      return createCandidate({
        directory,
        idSuffix: posix.basename(manifest.path, ".csproj"),
        name: posix.basename(manifest.path, ".csproj"),
        language: "dotnet",
        runtime: "dotnet",
        version: /<TargetFrameworks?>([^<]+)<\/TargetFrameworks?>/.exec(
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
        evidence: [{ kind: "manifest", path: manifest.path }],
      });
    });
}
