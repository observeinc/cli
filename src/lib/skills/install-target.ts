/**
 * Write a skill into local agent skills directories.
 *
 * The install model is one canonical copy plus symlinks. The whole skill
 * directory is written once to a canonical location — global
 * `~/.agents/skills/<name>/` (also the shared store some agents read directly)
 * or repo-local `./.agents/skills/<name>/` with `--project` — and then symlinked
 * into every detected agent's skills dir for that mode. Where an agent's dir
 * already *is* the canonical path (e.g. agents whose project dir is
 * `.agents/skills`), no symlink is needed; where the OS rejects symlinks
 * (notably Windows without privilege), the directory is copied instead.
 *
 * Re-installing rewrites the target directories, so install doubles as update.
 * Filesystem access uses `node:fs` directly; only the symlink call is injectable
 * so tests can exercise the copy fallback.
 */
import { mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import matter from "gray-matter";
import type { SkillResource } from "../../rest/generated";
import type { Agent } from "./agents";
import { SKILL_NAME_PATTERN } from "./bundled";

export interface InstalledPath {
  /** Absolute path written. */
  path: string;
  /** `canonical` = the source copy; `symlink`/`copy` = a per-agent target. */
  kind: "canonical" | "symlink" | "copy";
}

/**
 * Write the skill's files to the canonical location and link it into each
 * detected agent's skills dir. Returns every path written, canonical first.
 */
export function installSkill({
  name,
  files,
  project = false,
  agents,
  home = homedir(),
  cwd = process.cwd(),
  symlink = defaultSymlink,
}: {
  /** Directory name under `skills/` (bundled skill name or slugified label). */
  name: string;
  /** The skill's whole file set, keyed by POSIX relative path. */
  files: Map<string, Uint8Array>;
  project?: boolean;
  agents: Agent[];
  home?: string;
  cwd?: string;
  /** Symlink implementation; overridden in tests to force the copy fallback. */
  symlink?: (target: string, path: string) => void;
}): InstalledPath[] {
  // Guard the directory name before it reaches the destructive writeSkillDir
  // below: an empty or unsafe name would make `join(root, name)` collapse to
  // the skills root (path.join drops "") and rmSync would wipe the whole store,
  // and an unchecked name could traverse outside it.
  if (!SKILL_NAME_PATTERN.test(name)) {
    throw new Error(
      `Invalid skill name: ${name} (expected lowercase letters, digits, and hyphens)`,
    );
  }

  const canonicalDir = project
    ? join(cwd, ".agents", "skills", name)
    : join(home, ".agents", "skills", name);

  writeSkillDir(canonicalDir, files);
  const installed: InstalledPath[] = [
    { path: canonicalDir, kind: "canonical" },
  ];

  // Skip any target that resolves to a path already written — the canonical dir
  // itself, or a dir several agents share (e.g. `.agents/skills` in project
  // mode).
  const seen = new Set([resolve(canonicalDir)]);

  for (const agent of agents) {
    const baseDir = project
      ? join(cwd, agent.projectSkillsDir)
      : agent.globalSkillsDir;
    const targetDir = join(baseDir, name);

    const key = resolve(targetDir);
    if (seen.has(key)) continue;
    seen.add(key);

    mkdirSync(dirname(targetDir), { recursive: true });
    rmSync(targetDir, { recursive: true, force: true });
    try {
      symlink(canonicalDir, targetDir);
      installed.push({ path: targetDir, kind: "symlink" });
    } catch {
      writeSkillDir(targetDir, files);
      installed.push({ path: targetDir, kind: "copy" });
    }
  }

  return installed;
}

function defaultSymlink(target: string, path: string): void {
  symlinkSync(target, path, "dir");
}

/**
 * (Over)write `files` into `dir`, clearing it first so a re-install drops files
 * removed upstream rather than leaving them behind.
 */
function writeSkillDir(dir: string, files: Map<string, Uint8Array>): void {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const [relPath, bytes] of files) {
    const dest = join(dir, ...relPath.split("/"));
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, bytes);
  }
}

/**
 * A directory name from a user-defined skill's label: lowercased, every run of
 * non-alphanumerics collapsed to a single `-`, and leading/trailing `-` trimmed.
 */
export function slugifyLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Turn a user-defined (platform) skill into an installable directory: a single
 * `SKILL.md` whose frontmatter carries the slug and description and whose body
 * is the skill's content. `matter.stringify` handles YAML-escaping the values.
 */
export function synthesizeUserSkill(skill: SkillResource): {
  name: string;
  files: Map<string, Uint8Array>;
} {
  const name = slugifyLabel(skill.label);
  if (!name) {
    // A label with no [a-z0-9] characters (e.g. emoji-only, or a script the
    // slug regex strips entirely) leaves nothing to name the directory after.
    throw new Error(
      `Cannot derive a skill directory name from label "${skill.label}"`,
    );
  }
  const markdown = matter.stringify(skill.content ?? "", {
    name,
    description: skill.description,
  });
  return {
    name,
    files: new Map([["SKILL.md", new TextEncoder().encode(markdown)]]),
  };
}
