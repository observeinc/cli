import { createHash } from "node:crypto";

/** Order-independent hash of a skill's file tree; detects content changes and renames. */
export function skillManifestHash(files: Map<string, Uint8Array>): string {
  const keys = [...files.keys()].sort();
  const manifest = keys
    .map((key) => {
      const md5hex = createHash("md5")
        .update(files.get(key) ?? new Uint8Array(0))
        .digest("hex");
      return `${key}\0${md5hex}`;
    })
    .join("\n");
  return createHash("md5").update(manifest).digest("hex");
}
