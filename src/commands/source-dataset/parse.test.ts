import { describe, expect, test } from "bun:test";
import {
  buildObjectTags,
  buildUpdateBody,
  parseRetentionDays,
  parseTag,
} from "./parse";

describe("source-dataset parse", () => {
  test("parseTag splits on the first =", () => {
    expect(parseTag("team=core")).toEqual(["team", "core"]);
    expect(parseTag("q=a=b")).toEqual(["q", "a=b"]);
    expect(() => parseTag("novalue")).toThrow(/key=value/);
    expect(() => parseTag("=x")).toThrow(/key=value/);
  });

  test("buildObjectTags groups repeated keys", () => {
    expect(
      buildObjectTags([
        ["team", "core"],
        ["team", "infra"],
        ["env", "prod"],
      ]),
    ).toEqual({ team: ["core", "infra"], env: ["prod"] });
  });

  test("parseRetentionDays accepts non-negative integers only", () => {
    expect(parseRetentionDays("30")).toBe(30);
    expect(parseRetentionDays("0")).toBe(0);
    expect(() => parseRetentionDays("-1")).toThrow();
    expect(() => parseRetentionDays("1.5")).toThrow();
  });

  test("buildUpdateBody sends only passed fields", () => {
    expect(buildUpdateBody({ label: "Logs/new", retentionDays: 7 })).toEqual({
      label: "Logs/new",
      dataRetentionDays: 7,
    });
  });

  test("buildUpdateBody --clear-* flags send null, tags send {}", () => {
    expect(
      buildUpdateBody({
        clearDescription: true,
        clearIcon: true,
        clearTags: true,
        clearRetention: true,
      }),
    ).toEqual({
      description: null,
      icon: null,
      objectTags: {},
      dataRetentionDays: null,
    });
  });

  test("buildUpdateBody rejects a value together with its clear flag", () => {
    expect(() =>
      buildUpdateBody({ description: "x", clearDescription: true }),
    ).toThrow(/cannot be used together/);
  });

  test("buildUpdateBody rejects an empty update", () => {
    expect(() => buildUpdateBody({})).toThrow(/Nothing to update/);
  });
});
