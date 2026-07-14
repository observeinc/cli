import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createMockContext as sharedCreateMockContext } from "../../test-helpers";
import { install } from "./install";

function makeTempDir(): string {
  const dir = join(
    "/tmp",
    `observe-setup-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

// install reads process.execPath (to locate the binary dir), so pin it here.
function createMockContext(env: Record<string, string | undefined> = {}) {
  return sharedCreateMockContext({ env, execPath: "/usr/local/bin/observe" });
}

describe("install command", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = makeTempDir();
    writeFileSync(join(testDir, ".zshrc"), "# existing config\n");
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test("modifies PATH and reports success", async () => {
    const { context, stdout, stderr } = createMockContext({
      SHELL: "/bin/zsh",
      HOME: testDir,
    });

    await install.call(context, {});

    const output = stdout.join("");
    expect(output).toContain("✓");
    expect(stderr).toHaveLength(0);
  });

  test("skips PATH modification with --no-modify-path", async () => {
    const { context, stdout } = createMockContext({
      SHELL: "/bin/zsh",
      HOME: testDir,
      PATH: "/usr/bin",
    });

    await install.call(context, { "no-modify-path": true });

    const output = stdout.join("");
    expect(output).not.toContain("Added");
  });

  test("quiet mode suppresses messages", async () => {
    const { context, stdout } = createMockContext({
      SHELL: "/bin/zsh",
      HOME: testDir,
    });

    await install.call(context, { quiet: true });

    expect(stdout).toHaveLength(0);
  });

  test("handles bash shell", async () => {
    writeFileSync(join(testDir, ".bashrc"), "# bash config\n");

    const { context, stderr } = createMockContext({
      SHELL: "/bin/bash",
      HOME: testDir,
    });

    await install.call(context, {});

    expect(stderr).toHaveLength(0);
  });

  test("handles fish shell", async () => {
    const fishDir = join(testDir, ".config/fish");
    mkdirSync(fishDir, { recursive: true });
    writeFileSync(join(fishDir, "config.fish"), "# fish config\n");

    const { context, stderr } = createMockContext({
      SHELL: "/usr/bin/fish",
      HOME: testDir,
    });

    await install.call(context, {});

    expect(stderr).toHaveLength(0);
  });

  test("handles ash shell", async () => {
    writeFileSync(join(testDir, ".profile"), "# profile\n");

    const { context, stderr } = createMockContext({
      SHELL: "/bin/ash",
      HOME: testDir,
    });

    await install.call(context, {});

    expect(stderr).toHaveLength(0);
  });

  test("first run shows welcome message", async () => {
    const { context, stdout } = createMockContext({
      SHELL: "/bin/zsh",
      HOME: testDir,
    });

    await install.call(context, {});

    const output = stdout.join("");
    expect(output).toContain("observe was installed successfully");
    expect(output).toContain("observe auth login");
  });

  test("subsequent run skips welcome message", async () => {
    const { context: ctx1 } = createMockContext({
      SHELL: "/bin/zsh",
      HOME: testDir,
    });
    await install.call(ctx1, {});

    const { context: ctx2, stdout } = createMockContext({
      SHELL: "/bin/zsh",
      HOME: testDir,
    });
    await install.call(ctx2, {});

    const output = stdout.join("");
    expect(output).not.toContain("observe was installed successfully");
  });
});
