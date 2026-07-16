import { describe, expect, test } from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../../test-helpers";
import { profileList, type ProfileListDeps } from "./list";

suppressAnsiColor();

const allProfiles = {
  default: { customerId: "111", domain: "observeinc", token: "tok-1" },
  staging: { customerId: "222", domain: "staging.observeinc", token: "tok-2" },
  production: {
    customerId: "333",
    domain: "prod.observeinc",
    token: "tok-3",
  },
};

describe("auth profile list", () => {
  test("lists profiles with active marker, customer ID, and domain", async () => {
    const deps: ProfileListDeps = {
      loadAllProfiles: () => allProfiles,
      getActiveProfileName: () => "staging",
    };
    const { context, stdout } = createMockContext();
    await profileList.call(context, {}, deps);

    const out = stdout.join("");
    expect(out).toContain("* staging");
    expect(out).toContain("222.staging.observeinc");
    expect(out).toContain("default");
    expect(out).toContain("111.observeinc");
    expect(out).not.toContain("* default");
    expect(out).not.toContain("* production");
  });

  test("shows message when no profiles exist", async () => {
    const deps: ProfileListDeps = {
      loadAllProfiles: () => ({}),
      getActiveProfileName: () => "default",
    };
    const { context, stdout } = createMockContext();
    await profileList.call(context, {}, deps);

    expect(stdout.join("")).toContain("No profiles configured");
  });

  test("outputs JSON when --json flag is set", async () => {
    const deps: ProfileListDeps = {
      loadAllProfiles: () => allProfiles,
      getActiveProfileName: () => "default",
    };
    const { context, stdout } = createMockContext();
    await profileList.call(context, { json: true }, deps);

    const parsed = JSON.parse(stdout.join("")) as Record<string, unknown>;
    expect(parsed).toMatchObject({
      default: { active: true, customerId: "111", domain: "observeinc" },
      staging: {
        active: false,
        customerId: "222",
        domain: "staging.observeinc",
      },
    });
  });
});
