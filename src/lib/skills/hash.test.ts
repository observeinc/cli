import { describe, expect, test } from "bun:test";
import { skillManifestHash } from "./hash";

const enc = new TextEncoder();

describe("skillManifestHash", () => {
  test("key insertion order does not affect the result", () => {
    const a = new Map<string, Uint8Array>([
      ["b.md", enc.encode("b")],
      ["a.md", enc.encode("a")],
    ]);
    const b = new Map<string, Uint8Array>([
      ["a.md", enc.encode("a")],
      ["b.md", enc.encode("b")],
    ]);
    expect(skillManifestHash(a)).toBe(skillManifestHash(b));
  });

  test("changes when file content changes", () => {
    const v1 = new Map<string, Uint8Array>([
      ["SKILL.md", enc.encode("version1")],
    ]);
    const v2 = new Map<string, Uint8Array>([
      ["SKILL.md", enc.encode("version2")],
    ]);
    expect(skillManifestHash(v1)).not.toBe(skillManifestHash(v2));
  });

  test("changes when a file is added", () => {
    const before = new Map<string, Uint8Array>([
      ["SKILL.md", enc.encode("body")],
    ]);
    const after = new Map<string, Uint8Array>([
      ["SKILL.md", enc.encode("body")],
      ["references/extra.md", enc.encode("extra")],
    ]);
    expect(skillManifestHash(before)).not.toBe(skillManifestHash(after));
  });
});
