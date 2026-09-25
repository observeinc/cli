import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createProjectSnapshot } from "./snapshot";
import { detectApplications } from "./detect";

const roots: string[] = [];

function fixture(files: Record<string, string>) {
  const root = join(
    "/tmp",
    `observe-instrument-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  roots.push(root);
  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(root, path);
    mkdirSync(join(fullPath, ".."), { recursive: true });
    writeFileSync(fullPath, content);
  }
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("instrumentation detection", () => {
  test("reads .NET child versions and evaluates all target frameworks", () => {
    const root = fixture({
      "Api.csproj":
        '<Project Sdk="Microsoft.NET.Sdk.Web"><TargetFrameworks>net6.0;net9.0</TargetFrameworks><ItemGroup><PackageReference Include="Npgsql"><Version>9.0.0</Version></PackageReference></ItemGroup></Project>',
    });
    const candidate = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates[0];
    expect(
      candidate?.dependencies.find((dependency) => dependency.name === "Npgsql")
        ?.version,
    ).toBe("9.0.0");
    expect(candidate?.language.version).toBe("net6.0;net9.0");
    expect(candidate?.compatibility?.runtimeVersionSupported).toBe("partial");
  });

  test("discovers bin/rails without scanning build bin directories", () => {
    const root = fixture({
      Gemfile: "source 'https://rubygems.org'",
      "bin/rails": "#!/usr/bin/env ruby",
      "bin/unrelated": "ignored",
      "nested/bin/ignored": "ignored",
    });
    const snapshot = createProjectSnapshot({ targetPath: root });
    expect(snapshot.files.map((file) => file.path)).toContain("bin/rails");
    expect(snapshot.files.map((file) => file.path)).not.toContain(
      "bin/unrelated",
    );
    expect(snapshot.files.map((file) => file.path)).not.toContain(
      "nested/bin/ignored",
    );
    expect(detectApplications(snapshot).candidates[0]?.language.id).toBe(
      "ruby",
    );
  });

  test("continues runtime inheritance past a malformed ancestor manifest", () => {
    const root = fixture({
      "package.json": '{"engines":{"node":"22"}}',
      "apps/package.json": "{bad",
      "apps/api/package.json":
        '{"name":"api","scripts":{"start":"node main.js"}}',
    });
    const snapshot = createProjectSnapshot({ targetPath: root });
    expect(detectApplications(snapshot).candidates[0]?.language.version).toBe(
      "22",
    );
    expect(snapshot.completeness.manifestsFailed).toBeUndefined();
  });

  test("requirements retain extras versions without inventing option packages", () => {
    const root = fixture({
      "requirements.txt":
        "requests[security]==2.32.0\n-r more.txt\n-e .\n--index-url https://example.invalid\ngit+https://example.invalid/repo\n",
      "main.py": "print('hello')",
    });
    const candidate = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates[0];
    expect(
      candidate?.dependencies.map((dependency) => [
        dependency.name,
        dependency.version,
      ]),
    ).toEqual([["requests", "==2.32.0"]]);
  });

  test.each([
    [
      "Pipfile",
      '[packages]\nrequests = "==2.32.0"\n[dev-packages]\nflask = "==3.0.0"',
    ],
    [
      "pyproject.toml",
      '[tool.poetry.dependencies]\nrequests = "==2.32.0"\n[tool.poetry.group.dev.dependencies]\nflask = "==3.0.0"',
    ],
  ])(
    "keeps development dependencies out of compatibility for %s",
    (path, content) => {
      const root = fixture({ [path]: content, "main.py": "print('hello')" });
      const candidate = detectApplications(
        createProjectSnapshot({ targetPath: root }),
      ).candidates[0];
      expect(
        candidate?.dependencies.find(
          (dependency) => dependency.name === "flask",
        )?.scope,
      ).toBe("development");
      expect(
        candidate?.compatibility?.packages.supported.map((item) => item.name),
      ).not.toContain("flask");
    },
  );

  test("Maven scopes and management sections do not become runtime dependencies", () => {
    const dependency = (name: string, scope = "compile") =>
      `<dependency><artifactId>${name}</artifactId><version>1.0</version><scope>${scope}</scope></dependency>`;
    const root = fixture({
      "pom.xml": `<project><artifactId>app</artifactId><dependencies>${dependency("junit", "test")}${dependency("servlet", "provided")}${dependency("runtime-lib")}</dependencies><dependencyManagement><dependencies>${dependency("managed")}</dependencies></dependencyManagement><build><plugins><plugin><dependencies>${dependency("plugin")}</dependencies></plugin></plugins></build></project>`,
      "src/main/java/Main.java": "public static void main(String[] args) {}",
    });
    const candidate = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates[0];
    expect(
      candidate?.dependencies.map((item) => [item.name, item.scope]),
    ).toEqual([
      ["junit", "test"],
      ["runtime-lib", "runtime"],
      ["servlet", "build"],
    ]);
  });

  test("reads runtime versions from non-default Dockerfiles", () => {
    const root = fixture({
      "requirements.txt": "requests==2.32.0",
      "main.py": "print('hello')",
      "Dockerfile.prod": "FROM python:3.12",
    });
    expect(
      detectApplications(createProjectSnapshot({ targetPath: root }))
        .candidates[0]?.language.version,
    ).toBe("3.12");
  });

  test("detects Node.js framework, package manager, and missing instrumentation", () => {
    const root = fixture({
      "package.json": JSON.stringify({
        name: "checkout",
        type: "module",
        packageManager: "pnpm@10",
        scripts: { start: "node src/server.js" },
        dependencies: {
          express: "^5.0.0",
          fastify: "^5.0.0",
          "@prisma/client": "^6.0.0",
          lodash: "^4.17.0",
        },
      }),
      "pnpm-lock.yaml": "lockfileVersion: '9.0'",
      "src/server.js": "import express from 'express';",
    });
    const detection = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    );
    expect(detection.candidates).toHaveLength(1);
    const candidate = detection.candidates[0]!;
    expect(candidate.id).toBe("nodejs:.");
    expect(candidate.frameworks[0]?.id).toBe("express");
    expect(candidate.packageManager?.id).toBe("pnpm");
    const compat = candidate.compatibility!;
    expect(compat.autoInstrumentationSupported).toBe(true);
    expect(compat.packages.supported.map((pkg) => pkg.name).sort()).toEqual([
      "@prisma/client",
      "express",
      "fastify",
    ]);
    expect(compat.packages.unsupported).toHaveLength(0);
    // lodash is an unrelated utility and is not reported in either bucket.
    expect(
      [...compat.packages.supported, ...compat.packages.unsupported].map(
        (pkg) => pkg.name,
      ),
    ).not.toContain("lodash");
  });

  test("uses unique candidate IDs for multiple dotnet projects", () => {
    const root = fixture({
      "Api.csproj": '<Project Sdk="Microsoft.NET.Sdk.Web" />',
      "Worker.csproj": '<Project Sdk="Microsoft.NET.Sdk.Worker" />',
      "Program.cs": "Host.CreateApplicationBuilder(args);",
    });
    const candidates = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates;
    expect(candidates.map((candidate) => candidate.id)).toEqual([
      "dotnet:.:Api",
      "dotnet:.:Worker",
    ]);
  });

  test("matches library coverage for each language", () => {
    const root = fixture({
      "python/requirements.txt": "fastapi==0.116.0\nrequests==2.32.0\n",
      "python/main.py": "from fastapi import FastAPI\napp = FastAPI()",
      "java/pom.xml":
        "<project><artifactId>orders</artifactId><dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId><version>3.5.0</version></dependency><dependency><groupId>org.postgresql</groupId><artifactId>postgresql</artifactId><version>42.7.0</version></dependency></dependencies></project>",
      "dotnet/api.csproj":
        '<Project Sdk="Microsoft.NET.Sdk.Web"><PropertyGroup><TargetFramework>net9.0</TargetFramework></PropertyGroup><ItemGroup><PackageReference Include="Npgsql" Version="9.0.0" /><PackageReference Include="Grpc.Net.Client" Version="2.52.0" /></ItemGroup></Project>',
      "dotnet/Program.cs":
        "var app = WebApplication.CreateBuilder(args).Build();",
      "ruby/Gemfile": "gem 'rails', '~> 8.0'\ngem 'sidekiq', '~> 7.0'\n",
    });
    const candidates = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates;
    const supportedCount = (language: string) =>
      candidates.find((candidate) => candidate.language.id === language)
        ?.compatibility?.packages.supported.length;
    expect(supportedCount("python")).toBe(2);
    expect(supportedCount("java")).toBe(2);
    expect(supportedCount("dotnet")).toBe(3);
    expect(supportedCount("ruby")).toBe(2);
  });

  test("returns stable candidates for a five-language monorepo", () => {
    const root = fixture({
      "node/package.json": JSON.stringify({
        name: "node-api",
        scripts: { start: "node index.js" },
        dependencies: { fastify: "5.0.0" },
      }),
      "python/requirements.txt": "fastapi==0.116.0\n",
      "python/main.py": "from fastapi import FastAPI\napp = FastAPI()",
      "java/pom.xml":
        "<project><artifactId>orders</artifactId><dependency><artifactId>spring-boot-starter-web</artifactId></dependency></project>",
      "dotnet/api.csproj":
        '<Project Sdk="Microsoft.NET.Sdk.Web"><PropertyGroup><TargetFramework>net9.0</TargetFramework></PropertyGroup></Project>',
      "dotnet/Program.cs":
        "var app = WebApplication.CreateBuilder(args).Build();",
      "ruby/Gemfile": "gem 'rails', '~> 8.0'\n",
    });
    const detection = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    );
    expect(
      detection.candidates.map((candidate) => candidate.language.id),
    ).toEqual(["dotnet", "java", "nodejs", "python", "ruby"]);
    expect(
      detection.diagnostics.map((diagnostic) => diagnostic.code),
    ).toContain("MULTIPLE_CANDIDATES");
  });

  test("resolves Spring Boot starters to their instrumented components", () => {
    const root = fixture({
      "build.gradle": [
        "dependencies {",
        "  implementation 'org.springframework.boot:spring-boot-starter-data-jpa'",
        "  implementation 'org.springframework.boot:spring-boot-starter-validation'",
        "}",
      ].join("\n"),
    });
    const candidate = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates.find((c) => c.language.id === "java")!;
    const supported = candidate.compatibility!.packages.supported;
    const jpa = supported.find(
      (pkg) => pkg.name === "spring-boot-starter-data-jpa",
    );
    expect(jpa?.aggregator).toBe(true);
    expect(jpa?.components).toContain("hibernate-core");
    // A starter with no instrumented components resolves to an empty set.
    const validation = supported.find(
      (pkg) => pkg.name === "spring-boot-starter-validation",
    );
    expect(validation?.aggregator).toBe(true);
    expect(validation?.components).toHaveLength(0);
    // Never flagged as an unsupported gap.
    expect(
      candidate.compatibility!.packages.unsupported.map((pkg) => pkg.name),
    ).not.toContain("spring-boot-starter-data-jpa");
  });

  test("detects an SDK-only runtime (Go) with no auto-instrumentation", () => {
    const root = fixture({
      "go.mod": "module example.com/svc\n\ngo 1.22\n",
      "main.go": "package main\nfunc main() {}\n",
    });
    const candidate = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates[0]!;
    expect(candidate.language.id).toBe("go");
    const compat = candidate.compatibility!;
    expect(compat.autoInstrumentationSupported).toBe(false);
    expect(compat.sdkStability).not.toBeNull();
    expect(compat.packages.supported).toHaveLength(0);
    expect(compat.packages.unsupported).toHaveLength(0);
  });

  test("detects a runtime OpenTelemetry does not support (Perl)", () => {
    const root = fixture({ cpanfile: "requires 'Mojolicious';\n" });
    const candidate = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates[0]!;
    expect(candidate.language.id).toBe("perl");
    const compat = candidate.compatibility!;
    expect(compat.autoInstrumentationSupported).toBe(false);
    expect(compat.sdkStability).toBeNull();
  });

  test("lockfile-resolved versions override declared ranges", () => {
    const root = fixture({
      "package.json": JSON.stringify({
        name: "api",
        scripts: { start: "node index.js" },
        dependencies: { express: "^4.18.0", mongodb: "^2.2.0" },
      }),
      "package-lock.json": JSON.stringify({
        lockfileVersion: 3,
        packages: {
          "node_modules/express": { version: "4.19.2" },
          "node_modules/mongodb": { version: "6.5.0" },
        },
      }),
    });
    const candidate = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates[0]!;
    const express = candidate.dependencies.find((d) => d.name === "express")!;
    expect(express.resolvedVersion).toBe("4.19.2");
    expect(express.sourceKind).toBe("lockfile");
    expect(candidate.evidence.some((e) => e.kind === "lockfile")).toBe(true);
    // The lockfile says mongodb 6.5.0, inside the range; the manifest range
    // ^2.2.0 alone would have been out of range.
    const compat = candidate.compatibility!;
    expect(compat.packages.unsupported.map((p) => p.name)).not.toContain(
      "mongodb",
    );
    const mongodb = compat.packages.supported.find((p) => p.name === "mongodb");
    expect(mongodb?.declaredVersion).toBe("6.5.0");
    expect(mongodb?.versionSource).toBe("lockfile");
  });

  test("reads recognized lockfiles beyond the general text limit", () => {
    const root = fixture({
      "package.json": JSON.stringify({
        name: "api",
        scripts: { start: "node index.js" },
        dependencies: { express: "^4.18.0" },
      }),
      "package-lock.json": JSON.stringify({
        lockfileVersion: 3,
        packages: {
          "node_modules/express": { version: "4.19.2" },
        },
      }),
    });
    const candidate = detectApplications(
      createProjectSnapshot({ targetPath: root, maxTextBytes: 16 }),
    ).candidates[0]!;
    expect(
      candidate.dependencies.find((dependency) => dependency.name === "express")
        ?.resolvedVersion,
    ).toBe("4.19.2");
  });

  test("Gemfile groups set dependency scope and keep every constraint", () => {
    const root = fixture({
      Gemfile: [
        "source 'https://rubygems.org'",
        "gem 'rails', '>= 7.1', '< 8'",
        "gem 'pg' # database",
        "group :development, :test do",
        "  gem 'rspec-rails'",
        "  platforms :mri do",
        "    gem 'debug'",
        "  end",
        "  gem 'factory_bot', '~> 6.0'",
        "end",
        "group :test do",
        "  gem 'capybara'",
        "end",
        "gem 'rubocop', require: false, group: :development",
        "gem 'puma', groups: [:default, :production]",
        "gem 'redis'",
      ].join("\n"),
    });
    const candidate = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates[0]!;
    const byName = Object.fromEntries(
      candidate.dependencies.map((dependency) => [
        dependency.name,
        [dependency.scope, dependency.version],
      ]),
    );
    expect(byName).toEqual({
      capybara: ["test", undefined],
      debug: ["development", undefined],
      factory_bot: ["development", "~> 6.0"],
      pg: ["runtime", undefined],
      puma: ["runtime", undefined],
      rails: ["runtime", ">= 7.1, < 8"],
      redis: ["runtime", undefined],
      "rspec-rails": ["development", undefined],
      rubocop: ["development", undefined],
    });
  });

  test("Gemfile.lock resolves gem versions", () => {
    const root = fixture({
      Gemfile: "gem 'rails', '~> 7.1'\ngem 'pg'\n",
      "Gemfile.lock": [
        "GEM",
        "  specs:",
        "    pg (1.5.4)",
        "    rails (7.1.3)",
        "",
      ].join("\n"),
    });
    const candidate = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates[0]!;
    const pg = candidate.dependencies.find((d) => d.name === "pg")!;
    expect(pg.resolvedVersion).toBe("1.5.4");
    expect(
      candidate.compatibility!.packages.supported.find((p) => p.name === "pg")
        ?.versionMatch,
    ).toBe("in-range");
  });

  test("an unparseable lockfile raises a diagnostic and keeps ranges", () => {
    const root = fixture({
      "package.json": JSON.stringify({
        name: "api",
        scripts: { start: "node index.js" },
        dependencies: { express: "^4.18.0" },
      }),
      "yarn.lock": "this is not a lockfile",
    });
    const candidate = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates[0]!;
    expect(candidate.diagnostics.map((d) => d.code)).toContain(
      "LOCKFILE_UNPARSEABLE",
    );
    expect(
      candidate.dependencies.find((d) => d.name === "express")?.resolvedVersion,
    ).toBeUndefined();
  });

  test("runtime version comes from .nvmrc when the manifest is silent", () => {
    const root = fixture({
      "package.json": JSON.stringify({
        name: "api",
        scripts: { start: "node index.js" },
      }),
      ".nvmrc": "v22.1.0\n",
    });
    const candidate = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates[0]!;
    expect(candidate.language.version).toBe("22.1.0");
    expect(candidate.compatibility?.runtimeVersionSupported).toBe("yes");
    expect(
      candidate.evidence.find((e) => e.kind === "runtime-version")?.path,
    ).toBe(".nvmrc");
  });

  test("runtime version comes from .tool-versions and Dockerfile FROM tags", () => {
    const root = fixture({
      "ruby/Gemfile": "gem 'rails', '~> 7.1'\n",
      "ruby/.tool-versions": "nodejs 20.11.0\nruby 3.3.0\n",
      "python/requirements.txt": "fastapi==0.116.0\n",
      "python/main.py": "app = 1",
      "python/Dockerfile": "FROM python:3.7-slim\nCOPY . .\n",
    });
    const candidates = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates;
    const ruby = candidates.find((c) => c.language.id === "ruby")!;
    expect(ruby.language.version).toBe("3.3.0");
    expect(ruby.compatibility?.runtimeVersionSupported).toBe("yes");
    const python = candidates.find((c) => c.language.id === "python")!;
    expect(python.language.version).toBe("3.7");
    expect(python.compatibility?.runtimeVersionSupported).toBe("no");
    expect(
      python.evidence.find((e) => e.kind === "runtime-version")?.value,
    ).toBe("python:3.7-slim");
  });

  test("manifest engines wins over a version file", () => {
    const root = fixture({
      "package.json": JSON.stringify({
        name: "api",
        engines: { node: "20" },
        scripts: { start: "node index.js" },
      }),
      ".nvmrc": "22\n",
    });
    const candidate = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates[0]!;
    expect(candidate.language.version).toBe("20");
  });

  test("Maven ${property} versions and java.version resolve", () => {
    const root = fixture({
      "pom.xml": [
        "<project>",
        "  <artifactId>orders</artifactId>",
        "  <properties>",
        "    <java.version>1.7</java.version>",
        "    <postgres.version>42.7.0</postgres.version>",
        "  </properties>",
        "  <dependencies>",
        "    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>",
        "    <dependency><groupId>org.postgresql</groupId><artifactId>postgresql</artifactId><version>${postgres.version}</version></dependency>",
        "    <dependency><groupId>x</groupId><artifactId>mystery</artifactId><version>${undefined.prop}</version></dependency>",
        "  </dependencies>",
        "</project>",
      ].join("\n"),
    });
    const candidate = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates.find((c) => c.language.id === "java")!;
    expect(candidate.language.version).toBe("1.7");
    expect(candidate.compatibility?.runtimeVersionSupported).toBe("no");
    expect(
      candidate.dependencies.find((d) => d.name === "postgresql")?.version,
    ).toBe("42.7.0");
    expect(
      candidate.dependencies.find((d) => d.name === "mystery")?.version,
    ).toBeUndefined();
  });

  test("Gradle toolchain declares the Java version", () => {
    const root = fixture({
      "build.gradle.kts": [
        'plugins { id("org.springframework.boot") } // spring-boot',
        "java { toolchain { languageVersion.set(JavaLanguageVersion.of(21)) } }",
        'dependencies { implementation("org.postgresql:postgresql:42.7.0") }',
      ].join("\n"),
    });
    const candidate = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates.find((c) => c.language.id === "java")!;
    expect(candidate.language.version).toBe("21");
    expect(candidate.compatibility?.runtimeVersionSupported).toBe("yes");
  });

  test("detects a PHP application from composer.json and composer.lock", () => {
    const root = fixture({
      "composer.json": JSON.stringify({
        name: "acme/shop",
        require: {
          php: "^8.2",
          "laravel/framework": "^11.0",
          "ext-pdo": "*",
          "guzzlehttp/guzzle": "^7.0",
        },
        "require-dev": { "phpunit/phpunit": "^11.0" },
      }),
      "composer.lock": JSON.stringify({
        packages: [
          { name: "laravel/framework", version: "v11.2.0" },
          { name: "guzzlehttp/guzzle", version: "7.8.1" },
        ],
        "packages-dev": [],
      }),
      "public/index.php": "<?php",
    });
    const candidate = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates.find((c) => c.language.id === "php")!;
    expect(candidate.id).toBe("php:.");
    expect(candidate.language.version).toBe("^8.2");
    expect(candidate.frameworks[0]?.id).toBe("laravel/framework");
    expect(candidate.dependencies.map((d) => d.name)).not.toContain("ext-pdo");
    expect(
      candidate.dependencies.find((d) => d.name === "laravel/framework")
        ?.resolvedVersion,
    ).toBe("11.2.0");
    const compat = candidate.compatibility!;
    expect(compat.autoInstrumentationSupported).toBe(true);
    expect(compat.runtimeVersionSupported).toBe("yes");
    expect(
      compat.packages.supported.find((p) => p.name === "laravel/framework")
        ?.versionMatch,
    ).toBe("in-range");
  });

  test("pyproject.toml keeps version specifiers and requires-python", () => {
    const root = fixture({
      "pyproject.toml": [
        "[project]",
        'name = "svc"',
        'requires-python = ">=3.11"',
        "dependencies = [",
        '  "fastapi>=0.100,<1",',
        '  "requests[security]==2.32.0",',
        "]",
        "",
        "[tool.poetry.dependencies]",
        'sqlalchemy = "^2.0"',
        'redis = {version = "~5.0", extras = ["hiredis"]}',
      ].join("\n"),
      "main.py": "app = 1",
    });
    const candidate = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates.find((c) => c.language.id === "python")!;
    const byName = new Map(
      candidate.dependencies.map((d) => [d.name, d.version]),
    );
    expect(byName.get("fastapi")).toBe(">=0.100,<1");
    expect(byName.get("requests")).toBe("==2.32.0");
    expect(byName.get("sqlalchemy")).toBe(">=2.0.0,<3.0.0");
    expect(byName.get("redis")).toBe(">=5.0.0,<5.1.0");
    expect(byName.has("python")).toBe(false);
    expect(candidate.name).toBe("svc");
    expect(candidate.language.version).toBe(">=3.11");
    expect(candidate.compatibility?.runtimeVersionSupported).toBe("yes");
  });

  test("expands Poetry caret ranges by the left-most non-zero component", () => {
    const root = fixture({
      "pyproject.toml": [
        "[tool.poetry.dependencies]",
        // The left-most non-zero component sets the ceiling.
        'a = "^1.2.3"', // major
        'b = "^0.2.3"', // minor
        'c = "^0.0.3"', // patch — the previously mis-widened case
        // All-zero specs bump the least significant written component.
        'd = "^0.0.0"',
        'e = "^0.0"',
        'f = "^0"',
      ].join("\n"),
      "main.py": "app = 1",
    });
    const candidate = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates.find((c) => c.language.id === "python")!;
    const byName = new Map(
      candidate.dependencies.map((d) => [d.name, d.version]),
    );
    expect(byName.get("a")).toBe(">=1.2.3,<2.0.0");
    expect(byName.get("b")).toBe(">=0.2.3,<0.3.0");
    expect(byName.get("c")).toBe(">=0.0.3,<0.0.4");
    expect(byName.get("d")).toBe(">=0.0.0,<0.0.1");
    expect(byName.get("e")).toBe(">=0.0.0,<0.1.0");
    expect(byName.get("f")).toBe(">=0.0.0,<1.0.0");
  });

  test("uses Poetry project name before the directory fallback", () => {
    const root = fixture({
      "service_directory/pyproject.toml": [
        "[tool.poetry]",
        'name = "poetry-service"',
        'version = "0.0.0"',
        "[tool.poetry.scripts]",
        'serve = "poetry_service:main"',
      ].join("\n"),
      "service_directory/poetry_service.py": "def main(): pass\n",
    });
    const candidate = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates.find((item) => item.language.id === "python")!;
    expect(candidate.id).toBe("python:service_directory");
    expect(candidate.name).toBe("poetry-service");
  });

  test("does not claim an entrypoint owned by a nested Python project", () => {
    const root = fixture({
      "pyproject.toml": [
        "[project]",
        'name = "workspace-root"',
        'version = "0.0.0"',
        'dependencies = ["nested-app"]',
      ].join("\n"),
      "apps/nested/pyproject.toml": [
        "[project]",
        'name = "nested-app"',
        'version = "0.0.0"',
        'dependencies = ["fastapi"]',
      ].join("\n"),
      "apps/nested/main.py": "from fastapi import FastAPI\napp = FastAPI()\n",
    });
    const candidates = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates.filter((candidate) => candidate.language.id === "python");
    expect(candidates.map((candidate) => candidate.id)).toEqual([
      "python:apps/nested",
    ]);
  });

  test("keeps language ownership independent in a polyglot project", () => {
    const root = fixture({
      "go.mod": "module example.com/polyglot\n\ngo 1.24\n",
      "cmd/server/main.go": "package main\nfunc main() {}\n",
      "tools/pyproject.toml": [
        "[project]",
        'name = "tool"',
        'version = "0.0.0"',
        "[project.scripts]",
        'tool = "tool:main"',
      ].join("\n"),
      "tools/tool.py": "def main(): pass\n",
      "cmd/server/helper.py": "print('not a Python project')\n",
    });
    const candidates = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates;
    expect(candidates.map((candidate) => candidate.id)).toEqual([
      "go:cmd/server",
      "python:tools",
    ]);
  });

  test("does not claim a Java main class owned by a nested build", () => {
    const root = fixture({
      "pom.xml": "<project><artifactId>parent</artifactId></project>",
      "child/pom.xml": "<project><artifactId>child</artifactId></project>",
      "child/src/main/java/App.java":
        "public class App { public static void main(String[] args) {} }",
    });
    const candidates = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates.filter((candidate) => candidate.language.id === "java");
    expect(candidates.map((candidate) => candidate.id)).toEqual([
      "java:child:pom.xml",
    ]);
  });

  test.each([
    ["java { sourceCompatibility = JavaVersion.VERSION_1_8 }", "1.8"],
    ["java { sourceCompatibility = JavaVersion.VERSION_17 }", "17"],
    ["kotlin { jvmToolchain(21) }", "21"],
  ])("reads the Gradle Java version from %s", (config, version) => {
    const root = fixture({
      "build.gradle": `plugins { id 'java' }\n${config}\n`,
      "src/main/java/x/App.java":
        "package x; public class App { public static void main(String[] a) {} }\n",
    });
    const candidate = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates[0]!;
    expect(candidate.language.version).toBe(version);
    expect(candidate.compatibility!.runtimeVersionSupported).toBe("yes");
  });

  test("Gradle configurations map to dependency scopes", () => {
    const root = fixture({
      "build.gradle": [
        "plugins { id 'java' }",
        "dependencies {",
        "  implementation 'com.squareup.okhttp3:okhttp:4.12.0'",
        "  runtimeOnly 'org.postgresql:postgresql:42.7.3'",
        "  compileOnly 'jakarta.servlet:jakarta.servlet-api:6.0.0'",
        "  annotationProcessor 'org.projectlombok:lombok:1.18.30'",
        "  testImplementation 'org.junit.jupiter:junit-jupiter:5.10.0'",
        "}",
      ].join("\n"),
      "src/main/java/x/App.java":
        "package x; public class App { public static void main(String[] a) {} }\n",
    });
    const candidate = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates[0]!;
    expect(
      Object.fromEntries(
        candidate.dependencies.map((dependency) => [
          dependency.name,
          dependency.scope,
        ]),
      ),
    ).toEqual({
      "jakarta.servlet-api": "build",
      "junit-jupiter": "test",
      lombok: "build",
      okhttp: "runtime",
      postgresql: "runtime",
    });
  });

  test("skips .NET test projects and class libraries", () => {
    const root = fixture({
      "Api/Api.csproj":
        '<Project Sdk="Microsoft.NET.Sdk.Web"><PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup></Project>',
      "Worker/Worker.csproj":
        '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net8.0</TargetFramework></PropertyGroup></Project>',
      "Api.Tests/Api.Tests.csproj":
        '<Project Sdk="Microsoft.NET.Sdk"><ItemGroup><PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.12.0" /></ItemGroup></Project>',
      "Api.Specs/Api.Specs.csproj":
        '<Project Sdk="Microsoft.NET.Sdk.Web"><PropertyGroup><IsTestProject>true</IsTestProject></PropertyGroup></Project>',
      "Shared/Shared.csproj":
        '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup></Project>',
    });
    expect(
      detectApplications(createProjectSnapshot({ targetPath: root }))
        .candidates.map((candidate) => candidate.path)
        .sort(),
    ).toEqual(["Api", "Worker"]);
  });

  test("skips Gradle build logic, aggregators, and library modules", () => {
    const root = fixture({
      "settings.gradle.kts": 'include("service", "service-api")\n',
      "build.gradle.kts":
        'plugins { base }\ndescription = "Backend built in Micronaut"\n',
      "gradle/plugins/common/build.gradle.kts":
        "plugins { `kotlin-dsl` }\ndependencies { implementation(libs.gradle.plugin.micronaut) }\n",
      "service-api/build.gradle.kts":
        "plugins { alias(libs.plugins.micronaut.library) }\ndependencies { implementation(mn.micronaut.http) }\n",
      "service/build.gradle.kts":
        "plugins { alias(libs.plugins.micronaut.application) }\n",
    });
    expect(
      detectApplications(
        createProjectSnapshot({ targetPath: root }),
      ).candidates.map((candidate) => candidate.path),
    ).toEqual(["service"]);
  });

  test("a library module with its own main is still an application", () => {
    const root = fixture({
      "build.gradle": "plugins { id 'java-library' }\n",
      "src/main/java/x/Tool.java":
        "package x; public class Tool { public static void main(String[] a) {} }\n",
    });
    expect(
      detectApplications(createProjectSnapshot({ targetPath: root }))
        .candidates,
    ).toHaveLength(1);
  });

  test("detects a Go module in a subdirectory with main at its root", () => {
    const root = fixture({
      "svc/go.mod": "module example.com/org/svc\n\ngo 1.24\n",
      "svc/main.go": "package main\nfunc main() {}\n",
    });
    const candidates = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates.filter((candidate) => candidate.language.id === "go");
    expect(
      candidates.map((candidate) => [candidate.id, candidate.name]),
    ).toEqual([["go:svc", "svc"]]);
  });

  test("Go direct requirements become dependencies; indirect ones do not", () => {
    const root = fixture({
      "go.mod": [
        "module example.com/svc",
        "",
        "go 1.25",
        "",
        "require github.com/gin-gonic/gin v1.10.0",
        "",
        "require (",
        "\tgoogle.golang.org/grpc v1.70.0",
        "\tgithub.com/redis/go-redis/v9 v9.7.0 // pinned for cluster fix",
        "\tgolang.org/x/net v0.30.0 // indirect",
        ")",
        "",
        "replace example.com/local => ../local",
      ].join("\n"),
      "main.go": "package main\nfunc main() {}\n",
    });
    const candidate = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates[0]!;
    expect(
      candidate.dependencies.map((dependency) =>
        [dependency.name, dependency.version].join("@"),
      ),
    ).toEqual([
      "github.com/gin-gonic/gin@v1.10.0",
      "github.com/redis/go-redis/v9@v9.7.0",
      "google.golang.org/grpc@v1.70.0",
    ]);
    const packages = candidate.compatibility!.packages;
    expect(packages.supported.map((pkg) => pkg.name)).toEqual([
      "google.golang.org/grpc",
    ]);
    expect(packages.unverified.map((pkg) => pkg.name)).toEqual([
      "github.com/gin-gonic/gin",
      "github.com/redis/go-redis/v9",
    ]);
    for (const pkg of [...packages.supported, ...packages.unverified])
      expect(pkg.activation).toBe("manual");
  });

  test("names a root Go module after its module path", () => {
    const root = fixture({
      "go.mod": "module github.com/acme/agent\n\ngo 1.24\n",
      "main.go": "package main\nfunc main() {}\n",
    });
    const candidate = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates[0]!;
    expect(candidate.name).toBe("agent");
  });

  test("does not claim Go commands owned by a nested module", () => {
    const root = fixture({
      "go.mod": "module example.com/root\n\ngo 1.24\n",
      "nested/go.mod": "module example.com/nested\n\ngo 1.24\n",
      "nested/cmd/tool/main.go": "package main\nfunc main() {}\n",
    });
    const candidates = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates.filter((candidate) => candidate.language.id === "go");
    expect(candidates.map((candidate) => candidate.id)).toEqual([
      "go:nested/cmd/tool",
    ]);
  });

  test("skips a Go module whose only main package is generated code", () => {
    const root = fixture({
      "go.mod": "module example.com/svc\n\ngo 1.24\n",
      "main.go": "package main\nfunc main() {}\n",
      // A generated build product (e.g. the OTel Collector Builder output).
      "build/go.mod": "module example.com/svc/build\n\ngo 1.24\n",
      "build/main.go":
        '// Code generated by "go.opentelemetry.io/collector/cmd/builder". DO NOT EDIT.\n\npackage main\nfunc main() {}\n',
    });
    const candidates = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates.filter((candidate) => candidate.language.id === "go");
    expect(candidates.map((candidate) => candidate.id)).toEqual(["go:."]);
  });

  test("detects production C++ binaries from Bazel rules and wrapper macros", () => {
    const root = fixture({
      "MODULE.bazel": 'module(name = "mono")',
      "toolchain/cc_toolchain_config.bzl": [
        "def with_sanitizers(builder, **kwargs):",
        "    builder(**kwargs)",
        "def hardened_cc_binary(**kwargs):",
        "    with_sanitizers(native.cc_binary, **kwargs)",
        "def hardened_cc_test(**kwargs):",
        "    with_sanitizers(native.cc_test, **kwargs)",
      ].join("\n"),
      "code/cpp/cmd/collector/BUILD.bazel": [
        'load("//toolchain:cc_toolchain_config.bzl", "hardened_cc_binary", "hardened_cc_test")',
        "hardened_cc_binary(",
        '    name = "collector_v2",',
        '    srcs = ["src/main.cpp"],',
        '    deps = ["//code/cpp/http"],',
        ")",
        "hardened_cc_binary(",
        '    name = "tags_bench",',
        '    srcs = ["test/tags_bench.cpp"],',
        ")",
        "hardened_cc_binary(",
        '    name = "debug_tool",',
        "    testonly = True,",
        '    srcs = ["test/debug_tool.cpp"],',
        ")",
        "hardened_cc_test(",
        '    name = "collector_test",',
        '    srcs = ["test/collector_test.cpp"],',
        ")",
      ].join("\n"),
      "code/cpp/cmd/collector/src/main.cpp": "int main() { return 0; }\n",
      "tools/BUILD": [
        "cc_binary(",
        '    name = "native_tool",',
        '    srcs = ["main.cc"],',
        ")",
      ].join("\n"),
      "tools/main.cc": "int main() { return 0; }\n",
    });
    const candidates = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    ).candidates.filter((candidate) => candidate.language.id === "cpp");
    expect(candidates.map((candidate) => candidate.id)).toEqual([
      "cpp:code/cpp/cmd/collector:collector_v2",
      "cpp:code/cpp/cmd/collector:tags_bench",
      "cpp:tools:native_tool",
    ]);
    expect(candidates[0]?.entrypoints[0]?.path).toBe(
      "code/cpp/cmd/collector/src/main.cpp",
    );
    expect(candidates[0]?.discovery).toMatchObject({
      completeness: "resolved",
      provenance: {
        provider: "bazel-static",
        target: "//code/cpp/cmd/collector:collector_v2",
        rule: "hardened_cc_binary",
      },
    });
  });

  test("reports dynamic CMake targets without hiding literal executable names", () => {
    const root = fixture({
      "CMakeLists.txt": [
        "add_executable(test_api main.cpp)",
        "add_executable(${DYNAMIC_TARGET} generated.cpp)",
      ].join("\n"),
      "main.cpp": "int main() { return 0; }",
    });
    const detection = detectApplications(
      createProjectSnapshot({ targetPath: root }),
    );
    const candidate = detection.candidates.find(
      (item) => item.language.id === "cpp",
    )!;
    expect(candidate.name).toBe("test_api");
    expect(candidate.discovery).toMatchObject({
      completeness: "partial",
      provenance: { provider: "cmake-static", rule: "add_executable" },
    });
    expect(
      detection.diagnostics.map((diagnostic) => diagnostic.code),
    ).toContain("DYNAMIC_TARGET_NAME");
  });

  test("skips symlinked directories and ignored dependency trees", () => {
    const root = fixture({
      "package.json": JSON.stringify({
        name: "root",
        scripts: { start: "node index.js" },
      }),
      "node_modules/fake/package.json": JSON.stringify({
        name: "fake",
        scripts: { start: "node index.js" },
      }),
    });
    const outside = fixture({
      "package.json": JSON.stringify({
        name: "outside",
        scripts: { start: "node index.js" },
      }),
    });
    symlinkSync(outside, join(root, "linked"));
    const snapshot = createProjectSnapshot({ targetPath: root });
    expect(
      snapshot.files.some((file) => file.path.startsWith("node_modules/")),
    ).toBe(false);
    expect(snapshot.files.some((file) => file.path.startsWith("linked/"))).toBe(
      false,
    );
  });
});
