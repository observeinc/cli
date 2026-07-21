import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/** Lists subdirectory names under `canonicalRoot`; returns [] if the root doesn't exist. */
export function listInstalledSkillNames(canonicalRoot: string): string[] {
  if (!existsSync(canonicalRoot)) return [];
  return readdirSync(canonicalRoot).filter((entry) =>
    statSync(join(canonicalRoot, entry)).isDirectory(),
  );
}

/** Recursively reads all files under `canonicalDir` into a relative-path → bytes map. */
export function readInstalledSkillFiles(
  canonicalDir: string,
): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>();
  function walk(dir: string, prefix: string) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const rel = prefix ? `${prefix}/${entry}` : entry;
      if (statSync(full).isDirectory()) {
        walk(full, rel);
      } else {
        files.set(rel, new Uint8Array(readFileSync(full)));
      }
    }
  }
  walk(canonicalDir, "");
  return files;
}
