import { createHash } from "node:crypto";
import manifestData from "./otel-support-manifest.yaml";
import { parseManifest, type OtelSupportManifest } from "./schema";

let cached: OtelSupportManifest | null = null;
let override: OtelSupportManifest | null = null;

/** Identity of the manifest a result was evaluated against. */
export interface ManifestInfo {
  schemaVersion: OtelSupportManifest["schemaVersion"];
  generatedAt: string;
  /** SHA-256 of the canonical JSON form of the parsed manifest. */
  sha256: string;
  /** `bundled` for the compiled-in copy, `override` for `--manifest <file>` or tests. */
  origin: "bundled" | "override";
}

/**
 * Load the bundled OpenTelemetry support manifest. Bun inlines the YAML import
 * at build time, so this reads no file at runtime and works from the compiled
 * single-file binary. The parsed result is validated against the schema once
 * and cached.
 */
export function loadManifest(): OtelSupportManifest {
  if (override != null) return override;
  cached ??= parseManifest(manifestData);
  return cached;
}

/**
 * Describe the manifest `loadManifest()` currently returns. Every result
 * carries this so a changed verdict can be traced to a data change rather than
 * a code change.
 */
export function manifestInfo(): ManifestInfo {
  const manifest = loadManifest();
  return {
    schemaVersion: manifest.schemaVersion,
    generatedAt: manifest.generatedAt,
    sha256: createHash("sha256").update(canonicalJson(manifest)).digest("hex"),
    origin: override != null ? "override" : "bundled",
  };
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) =>
    item != null && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item as Record<string, unknown>).sort(([a], [b]) =>
            a < b ? -1 : a > b ? 1 : 0,
          ),
        )
      : item,
  );
}

/**
 * Install a manifest to evaluate against instead of the bundled copy. Used by
 * `--manifest <file>` and by tests. The value is validated against the schema.
 * Passing `null` reverts to the bundled manifest. No network I/O happens here.
 */
export function setManifestOverride(
  manifest: OtelSupportManifest | null,
): void {
  override = manifest == null ? null : parseManifest(manifest);
}
