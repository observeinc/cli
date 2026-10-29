import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { findExecutable, runNativeResolver } from "./native-runner";

const windows = process.platform === "win32";
const exe = (name: string) => (windows ? `${name}.exe` : name);

let scratch: string;
let repo: string;
let tools: string;

function plant(directory: string, file: string, content = "") {
  mkdirSync(directory, { recursive: true });
  const path = join(directory, file);
  writeFileSync(path, content, { mode: 0o755 });
  return path;
}

beforeEach(() => {
  scratch = realpathSync(mkdtempSync(join(tmpdir(), "native-runner-")));
  repo = join(scratch, "repo");
  tools = join(scratch, "tools");
  mkdirSync(repo);
});

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe("findExecutable", () => {
  test("returns the absolute path of the first match on PATH", () => {
    const go = plant(tools, exe("go"));
    expect(
      findExecutable({ executable: "go", root: repo, searchPath: tools }),
    ).toEqual({ path: go });
  });

  test("never searches the working directory or relative PATH entries", () => {
    plant(repo, exe("go"));
    const searchPath = [".", "bin", ""].join(delimiter);
    const previous = process.cwd();
    process.chdir(repo);
    try {
      expect(
        findExecutable({ executable: "go", root: repo, searchPath }),
      ).toEqual({ error: "go is not installed or not on PATH" });
    } finally {
      process.chdir(previous);
    }
  });

  test("refuses a match inside the project instead of skipping it", () => {
    const bin = join(repo, "bin");
    plant(bin, exe("go"));
    plant(tools, exe("go"));
    const lookup = findExecutable({
      executable: "go",
      root: repo,
      searchPath: [bin, tools].join(delimiter),
    });
    expect("error" in lookup && lookup.error).toContain("inside the project");
  });

  test.skipIf(windows)(
    "follows symlinks before the inside-project check",
    () => {
      plant(join(repo, "bin"), "go");
      mkdirSync(tools);
      symlinkSync(join(repo, "bin", "go"), join(tools, "go"));
      const lookup = findExecutable({
        executable: "go",
        root: repo,
        searchPath: tools,
      });
      expect("error" in lookup && lookup.error).toContain("inside the project");
    },
  );

  test.skipIf(windows)("skips files that are not executable", () => {
    mkdirSync(tools);
    writeFileSync(join(tools, "go"), "", { mode: 0o644 });
    expect(
      findExecutable({ executable: "go", root: repo, searchPath: tools }),
    ).toEqual({ error: "go is not installed or not on PATH" });
  });

  test.skipIf(!windows)("accepts only .exe on Windows", () => {
    plant(tools, "go.cmd");
    plant(tools, "go.bat");
    plant(tools, "go");
    expect(
      findExecutable({ executable: "go", root: repo, searchPath: tools }),
    ).toEqual({ error: "go is not installed or not on PATH" });
  });

  test.skipIf(!windows)("accepts a quoted PATH entry", () => {
    const go = plant(tools, "go.exe");
    expect(
      findExecutable({
        executable: "go",
        root: repo,
        searchPath: `"${tools}"`,
      }),
    ).toEqual({ path: go });
  });
});

describe("runNativeResolver", () => {
  test("does not spawn when the executable cannot be found safely", () => {
    plant(join(repo, "bin"), exe("go"));
    const previous = process.env.PATH;
    process.env.PATH = join(repo, "bin");
    try {
      const result = runNativeResolver({
        executable: "go",
        args: [],
        cwd: repo,
        root: repo,
      });
      expect(result.status).toBe(1);
      expect(result.error).toContain("inside the project");
    } finally {
      process.env.PATH = previous;
    }
  });

  test.skipIf(windows)(
    "passes only allowlisted variables to the resolver",
    () => {
      plant(tools, "go", "#!/bin/sh\nexec /usr/bin/env\n");
      const overrides = {
        PATH: [tools, "/usr/bin", "/bin"].join(delimiter),
        CI_DEPLOY_TOKEN: "secret",
        MAVEN_OPTS: "-Dsecret=1",
        GOFLAGS: "-mod=mod",
      };
      const previous = Object.fromEntries(
        Object.keys(overrides).map((name) => [name, process.env[name]]),
      );
      Object.assign(process.env, overrides);
      try {
        const { stdout, status } = runNativeResolver({
          executable: "go",
          args: [],
          cwd: repo,
          root: repo,
        });
        expect(status).toBe(0);
        const env = new Set(stdout.split("\n"));
        expect(env.has("GOPROXY=off")).toBe(true);
        expect(env.has("GOFLAGS=-mod=readonly")).toBe(true);
        expect(stdout).not.toContain("CI_DEPLOY_TOKEN");
        expect(stdout).not.toContain("MAVEN_OPTS");
      } finally {
        for (const [name, value] of Object.entries(previous))
          if (value == null) Reflect.deleteProperty(process.env, name);
          else process.env[name] = value;
      }
    },
  );
});
