import { afterEach, describe, expect, test } from "bun:test";
import { fetchBundledSkill, fetchBundledSkillPath } from "./bundled";

const SAMPLE = `---
name: generate-opal
description: Core OPAL guidance
---

# Core OPAL
`;

describe("fetchBundledSkill", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  function mockFetch(status: number, body = "") {
    globalThis.fetch = (() =>
      Promise.resolve(
        new Response(body, { status }),
      )) as unknown as typeof fetch;
  }

  test("fetches SKILL.md from the raw repo URL and returns the parsed skill", async () => {
    let requestedUrl = "";
    globalThis.fetch = ((input: string) => {
      requestedUrl = input;
      return Promise.resolve(new Response(SAMPLE, { status: 200 }));
    }) as unknown as typeof fetch;

    const skill = await fetchBundledSkill("generate-opal");

    expect(requestedUrl).toBe(
      "https://raw.githubusercontent.com/observeinc/skills/main/skills/generate-opal/SKILL.md",
    );
    expect(skill?.name).toBe("generate-opal");
  });

  test("returns null on 404", async () => {
    mockFetch(404);
    expect(await fetchBundledSkill("nope")).toBeNull();
  });

  test("throws on a non-ok, non-404 response", async () => {
    mockFetch(500);
    let caught: unknown;
    try {
      await fetchBundledSkill("boom");
    } catch (error) {
      caught = error;
    }
    expect((caught as Error | undefined)?.message).toContain("HTTP 500");
  });

  test("rejects an invalid skill name without fetching", async () => {
    let called = false;
    globalThis.fetch = (() => {
      called = true;
      return Promise.resolve(new Response("", { status: 200 }));
    }) as unknown as typeof fetch;
    let caught: unknown;
    try {
      await fetchBundledSkill("../etc/passwd");
    } catch (error) {
      caught = error;
    }
    expect((caught as Error | undefined)?.message).toContain(
      "Invalid skill name",
    );
    expect(called).toBe(false);
  });
});

describe("fetchBundledSkillPath", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  function mockFetch(status: number, body = "") {
    globalThis.fetch = (() =>
      Promise.resolve(
        new Response(body, { status }),
      )) as unknown as typeof fetch;
  }

  test("fetches the file from the raw repo URL and returns its text", async () => {
    let requestedUrl = "";
    globalThis.fetch = ((input: string) => {
      requestedUrl = input;
      return Promise.resolve(new Response("# Logs\n", { status: 200 }));
    }) as unknown as typeof fetch;

    const content = await fetchBundledSkillPath(
      "generate-opal",
      "references/opal-logs.md",
    );

    expect(requestedUrl).toBe(
      "https://raw.githubusercontent.com/observeinc/skills/main/skills/generate-opal/references/opal-logs.md",
    );
    expect(content).toBe("# Logs\n");
  });

  test("returns null on 404", async () => {
    mockFetch(404);
    expect(
      await fetchBundledSkillPath("generate-opal", "references/missing.md"),
    ).toBeNull();
  });

  test("throws on a non-ok, non-404 response", async () => {
    mockFetch(500);
    let caught: unknown;
    try {
      await fetchBundledSkillPath("generate-opal", "references/boom.md");
    } catch (error) {
      caught = error;
    }
    expect((caught as Error | undefined)?.message).toContain("HTTP 500");
  });

  test("rejects an invalid skill name without fetching", async () => {
    let called = false;
    globalThis.fetch = (() => {
      called = true;
      return Promise.resolve(new Response("", { status: 200 }));
    }) as unknown as typeof fetch;
    let caught: unknown;
    try {
      await fetchBundledSkillPath("Bad Name", "references/opal-logs.md");
    } catch (error) {
      caught = error;
    }
    expect((caught as Error | undefined)?.message).toContain(
      "Invalid skill name",
    );
    expect(called).toBe(false);
  });

  test("rejects invalid relative paths without fetching", async () => {
    let called = false;
    globalThis.fetch = (() => {
      called = true;
      return Promise.resolve(new Response("", { status: 200 }));
    }) as unknown as typeof fetch;

    const badPaths = [
      "/etc/passwd", // leading slash
      "references/../../secret", // `..` segment
      "references/opal logs.md", // space is outside the charset
    ];
    for (const relPath of badPaths) {
      let caught: unknown;
      try {
        await fetchBundledSkillPath("generate-opal", relPath);
      } catch (error) {
        caught = error;
      }
      expect((caught as Error | undefined)?.message).toContain(
        "Invalid skill path",
      );
    }
    expect(called).toBe(false);
  });
});
