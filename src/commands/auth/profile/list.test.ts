import { describe, expect, test } from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../../test-helpers";
import { profileList, type ProfileListDeps } from "./list";

suppressAnsiColor();

describe("auth profile list", () => {
  test("lists profiles with active marker", async () => {
    const deps: ProfileListDeps = {
      listProfiles: () => ["default", "staging", "production"],
      getActiveProfileName: () => "staging",
    };
    const { context, stdout } = createMockContext();
    await profileList.call(context, {}, deps);

    const out = stdout.join("");
    expect(out).toContain("* staging (active)");
    expect(out).toContain("default");
    expect(out).toContain("production");
    expect(out).not.toContain("* default");
    expect(out).not.toContain("* production");
  });

  test("shows message when no profiles exist", async () => {
    const deps: ProfileListDeps = {
      listProfiles: () => [],
      getActiveProfileName: () => "default",
    };
    const { context, stdout } = createMockContext();
    await profileList.call(context, {}, deps);

    expect(stdout.join("")).toContain("No profiles configured");
  });

  test("outputs JSON when --json flag is set", async () => {
    const deps: ProfileListDeps = {
      listProfiles: () => ["default", "staging"],
      getActiveProfileName: () => "default",
    };
    const { context, stdout } = createMockContext();
    await profileList.call(context, { json: true }, deps);

    const parsed = JSON.parse(stdout.join(""));
    expect(parsed.profiles).toEqual(["default", "staging"]);
    expect(parsed.active).toBe("default");
  });
});
