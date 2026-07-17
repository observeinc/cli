import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { createTar } from "nanotar";
import {
  getBundledRepo,
  listBundledCatalog,
  readBundledSkillFiles,
} from "./bundled-repo";
import { GITHUB_SKILLS_ARCHIVE_URL } from "../constants";

const SKILL_ALPHA = `---
name: alpha
description: Alpha investigates alerts
---

# Alpha
`;
const REF_ALPHA = "# Alpha reference\n";
const SKILL_BETA = `---
name: beta
description: Beta onboards clusters
---

# Beta
`;

// Repo layout as it sits under the archive's top dir (relpaths from the repo
// root; the top-level `skills-main/` component is added by buildArchive).
const REPO_V1: Record<string, string> = {
  "skills/alpha/SKILL.md": SKILL_ALPHA,
  "skills/alpha/references/opal-logs.md": REF_ALPHA,
  "skills/beta/SKILL.md": SKILL_BETA,
};

/** A gzipped tar of the given files, nested under a single top-level dir, the
 *  same shape codeload serves for `…/tar.gz/main`. */
function buildArchive(
  files: Record<string, string>,
  topDir = "skills-main",
): Uint8Array<ArrayBuffer> {
  const tar = createTar(
    Object.entries(files).map(([relPath, data]) => ({
      name: `${topDir}/${relPath}`,
      data,
    })),
  );
  return Uint8Array.from(gzipSync(tar));
}

/** A `fetch` stub that records each call's URL and headers and returns whatever
 *  the handler produces, so tests never touch the network. */
function stubFetch(
  handler: (init: { headers?: Record<string, string> }) => Response,
) {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const fetchImpl = ((
    url: string,
    init: { headers?: Record<string, string> } = {},
  ) => {
    calls.push({ url, headers: init.headers ?? {} });
    return Promise.resolve(handler(init));
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

function ok(body: Uint8Array<ArrayBuffer>, etag: string) {
  return new Response(body, { status: 200, headers: { etag } });
}

describe("getBundledRepo", () => {
  let cacheDir: string;

  beforeEach(() => {
    cacheDir = join(
      "/tmp",
      `observe-bundled-repo-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(cacheDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(cacheDir, { recursive: true, force: true });
  });

  test("downloads and extracts on a cold cache, without If-None-Match", async () => {
    const { fetchImpl, calls } = stubFetch(() =>
      ok(buildArchive(REPO_V1), '"v1"'),
    );

    const repo = await getBundledRepo({ cacheDir, fetchImpl });

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(GITHUB_SKILLS_ARCHIVE_URL);
    expect(calls[0]!.headers["If-None-Match"]).toBeUndefined();

    expect(repo.etag).toBe('"v1"');
    expect(repo.skillsDir).toBe(join(cacheDir, "repo", "skills"));
    expect(existsSync(join(repo.skillsDir, "alpha", "SKILL.md"))).toBe(true);
    expect(
      existsSync(join(repo.skillsDir, "alpha", "references", "opal-logs.md")),
    ).toBe(true);
    expect(readFileSync(join(cacheDir, "etag"), "utf-8")).toBe('"v1"');
  });

  test("reuses the extract on a 304, sending the stored ETag", async () => {
    await getBundledRepo({
      cacheDir,
      fetchImpl: stubFetch(() => ok(buildArchive(REPO_V1), '"v1"')).fetchImpl,
    });

    // A sentinel inside the extract proves the 304 path does not re-extract.
    const sentinel = join(cacheDir, "repo", "skills", "alpha", "SENTINEL");
    writeFileSync(sentinel, "x");

    const { fetchImpl, calls } = stubFetch(
      () => new Response(null, { status: 304, headers: { etag: '"v1"' } }),
    );
    const repo = await getBundledRepo({ cacheDir, fetchImpl });

    expect(calls[0]!.headers["If-None-Match"]).toBe('"v1"');
    expect(repo.etag).toBe('"v1"');
    expect(existsSync(sentinel)).toBe(true);
  });

  test("re-extracts and updates the ETag on a 200", async () => {
    await getBundledRepo({
      cacheDir,
      fetchImpl: stubFetch(() => ok(buildArchive(REPO_V1), '"v1"')).fetchImpl,
    });

    // v2: alpha's reference file removed, a new gamma skill added.
    const repoV2: Record<string, string> = {
      "skills/alpha/SKILL.md": SKILL_ALPHA,
      "skills/beta/SKILL.md": SKILL_BETA,
      "skills/gamma/SKILL.md": `---\nname: gamma\ndescription: Gamma\n---\n`,
    };
    const { fetchImpl, calls } = stubFetch(() =>
      ok(buildArchive(repoV2), '"v2"'),
    );
    const repo = await getBundledRepo({ cacheDir, fetchImpl });

    // The stored ETag was still offered, but a 200 supersedes it.
    expect(calls[0]!.headers["If-None-Match"]).toBe('"v1"');
    expect(repo.etag).toBe('"v2"');
    expect(readFileSync(join(cacheDir, "etag"), "utf-8")).toBe('"v2"');

    expect(
      existsSync(join(repo.skillsDir, "alpha", "references", "opal-logs.md")),
    ).toBe(false);
    expect(existsSync(join(repo.skillsDir, "gamma", "SKILL.md"))).toBe(true);
  });

  test("throws on a non-ok, non-304 response", async () => {
    const { fetchImpl } = stubFetch(() => new Response("", { status: 500 }));
    let caught: unknown;
    try {
      await getBundledRepo({ cacheDir, fetchImpl });
    } catch (error) {
      caught = error;
    }
    expect((caught as Error | undefined)?.message).toContain("HTTP 500");
  });

  test("re-downloads when the ETag file is present but the extract is gone", async () => {
    await getBundledRepo({
      cacheDir,
      fetchImpl: stubFetch(() => ok(buildArchive(REPO_V1), '"v1"')).fetchImpl,
    });
    rmSync(join(cacheDir, "repo"), { recursive: true, force: true });

    const { fetchImpl, calls } = stubFetch(() =>
      ok(buildArchive(REPO_V1), '"v1"'),
    );
    const repo = await getBundledRepo({ cacheDir, fetchImpl });

    // No usable extract, so no conditional header and a full re-download.
    expect(calls[0]!.headers["If-None-Match"]).toBeUndefined();
    expect(existsSync(join(repo.skillsDir, "alpha", "SKILL.md"))).toBe(true);
  });
});

describe("listBundledCatalog", () => {
  let cacheDir: string;

  beforeEach(() => {
    cacheDir = join(
      "/tmp",
      `observe-bundled-repo-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(cacheDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(cacheDir, { recursive: true, force: true });
  });

  test("reads name + description from each SKILL.md, sorted by name", async () => {
    const repo = await getBundledRepo({
      cacheDir,
      fetchImpl: stubFetch(() => ok(buildArchive(REPO_V1), '"v1"')).fetchImpl,
    });

    expect(listBundledCatalog(repo)).toEqual([
      { name: "alpha", description: "Alpha investigates alerts" },
      { name: "beta", description: "Beta onboards clusters" },
    ]);
  });

  test("skips a directory whose SKILL.md is malformed", async () => {
    const repo = await getBundledRepo({
      cacheDir,
      fetchImpl: stubFetch(() =>
        ok(
          buildArchive({
            ...REPO_V1,
            "skills/broken/SKILL.md": "# no frontmatter\n",
          }),
          '"v1"',
        ),
      ).fetchImpl,
    });

    expect(listBundledCatalog(repo).map((s) => s.name)).toEqual([
      "alpha",
      "beta",
    ]);
  });
});

describe("readBundledSkillFiles", () => {
  let cacheDir: string;

  beforeEach(() => {
    cacheDir = join(
      "/tmp",
      `observe-bundled-repo-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(cacheDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(cacheDir, { recursive: true, force: true });
  });

  test("returns every file keyed by POSIX relpath, with raw bytes", async () => {
    const repo = await getBundledRepo({
      cacheDir,
      fetchImpl: stubFetch(() => ok(buildArchive(REPO_V1), '"v1"')).fetchImpl,
    });

    const files = readBundledSkillFiles(repo, "alpha");

    expect([...files.keys()].sort()).toEqual([
      "SKILL.md",
      "references/opal-logs.md",
    ]);
    const decode = (key: string) => new TextDecoder().decode(files.get(key));
    expect(decode("SKILL.md")).toBe(SKILL_ALPHA);
    expect(decode("references/opal-logs.md")).toBe(REF_ALPHA);
  });

  test("returns an empty map for a skill that does not exist", async () => {
    const repo = await getBundledRepo({
      cacheDir,
      fetchImpl: stubFetch(() => ok(buildArchive(REPO_V1), '"v1"')).fetchImpl,
    });

    expect(readBundledSkillFiles(repo, "does-not-exist").size).toBe(0);
  });

  test("throws on an invalid skill name rather than walking outside the cache", async () => {
    const repo = await getBundledRepo({
      cacheDir,
      fetchImpl: stubFetch(() => ok(buildArchive(REPO_V1), '"v1"')).fetchImpl,
    });

    expect(() => readBundledSkillFiles(repo, "../../etc")).toThrow(
      "Invalid skill name",
    );
  });
});
