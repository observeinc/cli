import { describe, expect, test } from "bun:test";
import {
  buildObjectTags,
  buildUpdateBody,
  parseObjectTag,
  parseRetentionDays,
} from "./parse";

describe("source-dataset parse", () => {
  test("parseObjectTag splits key=value on the first =", () => {
    expect(parseObjectTag("team=core")).toEqual({ team: ["core"] });
    expect(parseObjectTag("q=a=b")).toEqual({ q: ["a=b"] });
    expect(() => parseObjectTag("novalue")).toThrow(/key=value/);
    expect(() => parseObjectTag("=x")).toThrow(/key=value/);
  });

  test("parseObjectTag takes a JSON object for keys that contain =", () => {
    expect(parseObjectTag('{"a=b":["c","d"],"env":"prod"}')).toEqual({
      "a=b": ["c", "d"],
      env: ["prod"],
    });
    expect(() => parseObjectTag("{not json")).toThrow(/JSON/);
    expect(() => parseObjectTag('["a"]')).toThrow(/key=value/);
    expect(() => parseObjectTag('{"a":1}')).toThrow(/list of strings/);
  });

  test("buildObjectTags merges repeated keys", () => {
    expect(
      buildObjectTags([
        { team: ["core"] },
        { team: ["infra"] },
        { env: ["prod"], "a=b": ["c"] },
      ]),
    ).toEqual({ team: ["core", "infra"], env: ["prod"], "a=b": ["c"] });
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
        clearObjectTags: true,
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
