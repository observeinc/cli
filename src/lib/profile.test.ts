import { describe, expect, test } from "bun:test";
import { extractProfileFlag } from "./profile";

describe("extractProfileFlag", () => {
  test("returns undefined profile when no flag present", () => {
    const { args, profile } = extractProfileFlag(["auth", "login"]);
    expect(profile).toBeUndefined();
    expect(args).toEqual(["auth", "login"]);
  });

  test("extracts --profile with space-separated value", () => {
    const { args, profile } = extractProfileFlag([
      "--profile",
      "staging",
      "auth",
      "login",
    ]);
    expect(profile).toBe("staging");
    expect(args).toEqual(["auth", "login"]);
  });

  test("extracts -P with space-separated value", () => {
    const { args, profile } = extractProfileFlag([
      "-P",
      "staging",
      "auth",
      "status",
    ]);
    expect(profile).toBe("staging");
    expect(args).toEqual(["auth", "status"]);
  });

  test("extracts --profile=value", () => {
    const { args, profile } = extractProfileFlag([
      "--profile=staging",
      "auth",
      "status",
    ]);
    expect(profile).toBe("staging");
    expect(args).toEqual(["auth", "status"]);
  });

  test("extracts flag from middle of args", () => {
    const { args, profile } = extractProfileFlag([
      "auth",
      "--profile",
      "prod",
      "login",
      "--url",
      "example.com",
    ]);
    expect(profile).toBe("prod");
    expect(args).toEqual(["auth", "login", "--url", "example.com"]);
  });

  test("last occurrence wins when flag appears multiple times", () => {
    const { args, profile } = extractProfileFlag([
      "--profile",
      "first",
      "--profile",
      "second",
      "auth",
    ]);
    expect(profile).toBe("second");
    expect(args).toEqual(["auth"]);
  });

  test("does not extract --profile after --", () => {
    const { args, profile } = extractProfileFlag([
      "query",
      "--",
      "--profile",
      "staging",
    ]);
    expect(profile).toBeUndefined();
    expect(args).toEqual(["query", "--", "--profile", "staging"]);
  });

  test("handles --profile at end of args with no value", () => {
    const { args, profile } = extractProfileFlag(["auth", "--profile"]);
    expect(profile).toBeUndefined();
    expect(args).toEqual(["auth", "--profile"]);
  });

  test("handles -P at end of args with no value", () => {
    const { args, profile } = extractProfileFlag(["auth", "-P"]);
    expect(profile).toBeUndefined();
    expect(args).toEqual(["auth", "-P"]);
  });

  test("handles empty args", () => {
    const { args, profile } = extractProfileFlag([]);
    expect(profile).toBeUndefined();
    expect(args).toEqual([]);
  });

  test("handles --profile= with empty value", () => {
    const { args, profile } = extractProfileFlag([
      "--profile=",
      "auth",
      "status",
    ]);
    expect(profile).toBe("");
    expect(args).toEqual(["auth", "status"]);
  });
});
