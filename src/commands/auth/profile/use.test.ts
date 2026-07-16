import { describe, expect, mock, test } from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../../test-helpers";
import { profileUse, type ProfileUseDeps } from "./use";

suppressAnsiColor();

describe("auth profile use", () => {
  test("switches to the specified profile", async () => {
    const setCurrentProfile = mock((_name: string) => undefined);
    const deps: ProfileUseDeps = { setCurrentProfile };
    const { context, stdout } = createMockContext();

    await profileUse.call(context, {}, "staging", deps);

    expect(setCurrentProfile).toHaveBeenCalledWith("staging");
    expect(stdout.join("")).toContain('Switched to profile "staging"');
  });

  test("reports error when profile does not exist", async () => {
    const setCurrentProfile = mock((_name: string) => {
      throw new Error(
        'Profile "missing" not found. Available profiles: default, staging',
      );
    });
    const deps: ProfileUseDeps = { setCurrentProfile };
    const { context, stderr, getExitCode } = createMockContext();

    await profileUse.call(context, {}, "missing", deps);

    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain('Profile "missing" not found');
  });
});
