/**
 * Fetch the whole Observe-curated ("bundled") skills repo as a tarball and
 * cache it locally, so `list` / `install` / `update` can see the full catalog
 * and read any skill's complete file set from one cheap request.
 *
 * The archive comes from codeload (see `GITHUB_SKILLS_ARCHIVE_URL`), which
 * serves an ETag and honors `If-None-Match`. We store the ETag alongside the
 * extracted repo and send it on the next fetch: a `304` reuses the extract
 * untouched; a `200` re-extracts and stores the new ETag. Fetching raw rather
 * than via the GitHub API avoids its 60 req/hr unauthenticated rate limit.
 *
 * The download, extract, and filesystem dependencies are injectable so tests
 * never touch the network.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { gunzipSync } from "node:zlib";
import { parseTar } from "nanotar";
import { GITHUB_SKILLS_ARCHIVE_URL } from "../constants";
import { getConfigDir } from "../config";
import { parseSkillMarkdown } from "./parse";
import { SKILL_NAME_PATTERN } from "./bundled";

export interface BundledRepo {
  /** Absolute path to the repo's `skills/` directory in the local cache. */
  skillsDir: string;
  /** ETag of the archive currently extracted in the cache. */
  etag: string;
}

/** Default cache location: `~/.observe/cache/skills/`. */
function defaultCacheDir(): string {
  return join(getConfigDir(), "cache", "skills");
}

/**
 * Ensure the bundled skills repo is extracted in the local cache and return the
 * path to its `skills/` directory. Sends the stored ETag as `If-None-Match`:
 * a `304` reuses the existing extract; a `200` gunzips + un-tars the archive
 * into the cache and stores the new ETag. With no usable cache it downloads,
 * extracts, and stores the ETag.
 */
export async function getBundledRepo(
  opts: {
    signal?: AbortSignal;
    /** Override the cache directory. */
    cacheDir?: string;
    /** Override the `fetch` implementation. */
    fetchImpl?: typeof fetch;
  } = {},
): Promise<BundledRepo> {
  const cacheDir = opts.cacheDir ?? defaultCacheDir();
  const fetchImpl = opts.fetchImpl ?? fetch;

  const etagPath = join(cacheDir, "etag");
  const repoDir = join(cacheDir, "repo");
  const skillsDir = join(repoDir, "skills");

  // Only trust a stored ETag when the extract it describes is still present.
  const storedEtag =
    existsSync(etagPath) && existsSync(skillsDir)
      ? readFileSync(etagPath, "utf-8")
      : undefined;

  const headers: Record<string, string> = {};
  if (storedEtag) {
    headers["If-None-Match"] = storedEtag;
  }

  const response = await fetchImpl(GITHUB_SKILLS_ARCHIVE_URL, {
    headers,
    signal: opts.signal,
  });

  if (response.status === 304 && storedEtag) {
    return { skillsDir, etag: storedEtag };
  }
  if (!response.ok) {
    throw new Error(
      `Failed to fetch bundled skills archive: HTTP ${String(response.status)}`,
    );
  }

  const etag = response.headers.get("etag") ?? "";
  const gz = new Uint8Array(await response.arrayBuffer());
  // Copy the gunzip output into a fresh Uint8Array: nanotar reads the entire
  // backing ArrayBuffer and ignores a view's byteOffset/length.
  const entries = parseTar(new Uint8Array(gunzipSync(gz)));

  extractRepo({ entries, repoDir });

  // Store the ETag only after a successful extract, so a crash mid-extract
  // leaves the old ETag and the next fetch re-downloads rather than trusting a
  // partial cache.
  writeFileSync(etagPath, etag);

  return { skillsDir, etag };
}

/**
 * The bundled catalog: one entry per `skills/<name>/` directory, taken from its
 * SKILL.md frontmatter and sorted by name. Directories whose SKILL.md is
 * missing or malformed are skipped.
 */
export function listBundledCatalog(repo: BundledRepo) {
  if (!existsSync(repo.skillsDir)) {
    return [];
  }

  return readdirSync(repo.skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .flatMap((name) => {
      const skillMd = join(repo.skillsDir, name, "SKILL.md");
      if (!existsSync(skillMd)) {
        return [];
      }
      try {
        const parsed = parseSkillMarkdown(readFileSync(skillMd, "utf-8"));
        return [{ name: parsed.name, description: parsed.description }];
      } catch {
        return [];
      }
    });
}

/**
 * Read every file under `skills/<name>/`, keyed by its POSIX relative path from
 * that directory (e.g. `SKILL.md`, `references/opal-logs.md`). Returns an empty
 * map when the skill directory is absent. Throws on an invalid name.
 */
export function readBundledSkillFiles(repo: BundledRepo, name: string) {
  if (!SKILL_NAME_PATTERN.test(name)) {
    throw new Error(
      `Invalid skill name: ${name} (expected lowercase letters, digits, and hyphens)`,
    );
  }
  const skillRoot = join(repo.skillsDir, name);
  const files = new Map<string, Uint8Array>();
  if (existsSync(skillRoot)) {
    walkSkillFiles({ dir: skillRoot, prefix: "", files });
  }
  return files;
}

function walkSkillFiles({
  dir,
  prefix,
  files,
}: {
  dir: string;
  prefix: string;
  files: Map<string, Uint8Array>;
}) {
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  for (const entry of entries) {
    // POSIX-joined key so relpaths are `/`-separated on every platform.
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSkillFiles({ dir: abs, prefix: relPath, files });
    } else if (entry.isFile()) {
      files.set(relPath, new Uint8Array(readFileSync(abs)));
    }
  }
}

/** The subset of a parsed tar entry we consume. */
interface TarEntry {
  name: string;
  type: string | undefined;
  data?: Uint8Array;
}

/**
 * Extract the tar entries into `repoDir`, dropping the archive's single
 * top-level directory (`skills-main/`) so the repo's own layout — `skills/…` —
 * sits directly under `repoDir`. The target is cleared first so files removed
 * upstream don't linger from a previous extract.
 */
function extractRepo({
  entries,
  repoDir,
}: {
  entries: TarEntry[];
  repoDir: string;
}) {
  rmSync(repoDir, { recursive: true, force: true });
  mkdirSync(repoDir, { recursive: true });

  for (const entry of entries) {
    if (entry.type !== "file" || !entry.data) {
      continue;
    }
    const relPath = stripTopDir(entry.name);
    if (!relPath) {
      continue;
    }
    const dest = join(repoDir, relPath);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, entry.data);
  }
}

/**
 * Drop the leading path component (the archive's top-level `skills-main/` dir).
 * Returns null for a top-level file, a directory entry, or any path that tries
 * to escape via a leading `/` or a `..` segment.
 */
function stripTopDir(name: string): string | null {
  const clean = name.replace(/^\.\//, "");
  const slash = clean.indexOf("/");
  if (slash === -1) {
    return null;
  }
  const rel = clean.slice(slash + 1);
  if (!rel || rel.endsWith("/")) {
    return null;
  }
  if (rel.startsWith("/") || rel.split("/").includes("..")) {
    return null;
  }
  return rel;
}
