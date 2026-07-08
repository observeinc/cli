import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../test-helpers";
import type { ShellInfo } from "../../lib/shell";
import { uninstall, type UninstallDeps } from "./uninstall";

// The handler's filesystem/shell work is delegated to lib/shell (covered by
// shell.test.ts). Here we inject spies for detectShell/removeObserveBlocks so
// this unit test exercises only the handler's own branching — no real fs.
let shellInfo: ShellInfo;
let removedCount: number;

const detectShellFn = mock(
  (_shell?: string, _home?: string, _xdg?: string): ShellInfo => shellInfo,
);
const removeObserveBlocksFn = mock((_configFile: string) => removedCount);

const deps: UninstallDeps = {
  detectShell: detectShellFn,
  removeObserveBlocks: removeObserveBlocksFn,
};

beforeEach(() => {
  detectShellFn.mockClear();
  removeObserveBlocksFn.mockClear();
  shellInfo = {
    type: "bash",
    configFile: "/home/user/.bashrc",
  } as unknown as ShellInfo;
  removedCount = 1;
});

suppressAnsiColor();

describe("cli uninstall", () => {
  test("reports how many observe blocks were removed", async () => {
    removedCount = 2;
    const { context, stdout } = createMockContext();
    await uninstall.call(context, {}, deps);

    expect(removeObserveBlocksFn).toHaveBeenCalledWith("/home/user/.bashrc");
    const out = stdout.join("");
    expect(out).toContain("Removed 2 observe block(s) from /home/user/.bashrc");
    expect(out).toContain("Uninstall complete.");
  });

  test("reports nothing to remove when no observe blocks are present", async () => {
    removedCount = 0;
    const { context, stdout } = createMockContext();
    await uninstall.call(context, {}, deps);
    expect(stdout.join("")).toContain(
      "No observe entries found in /home/user/.bashrc",
    );
  });

  test("reports when no shell config file is detected", async () => {
    shellInfo = { type: "bash", configFile: null } as unknown as ShellInfo;
    const { context, stdout } = createMockContext();
    await uninstall.call(context, {}, deps);

    expect(removeObserveBlocksFn).not.toHaveBeenCalled();
    expect(stdout.join("")).toContain("No shell config file found");
  });

  test("suppresses output with --quiet but still removes blocks", async () => {
    const { context, stdout } = createMockContext();
    await uninstall.call(context, { quiet: true }, deps);

    expect(removeObserveBlocksFn).toHaveBeenCalledTimes(1);
    expect(stdout.join("")).toBe("");
  });
});
