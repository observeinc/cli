import { readFileSync } from "node:fs";

/**
 * Resolves a `--data` (inline JSON) / `--file` (path to JSON) pair into a
 * parsed value. The two flags are mutually exclusive and one is required.
 * Throws with an actionable message on bad/missing input. Callers narrow the
 * returned value to the expected request body type.
 */
export function loadJsonInput(
  inline: string | undefined,
  filePath: string | undefined,
  flagName = "data",
): unknown {
  if (inline !== undefined && filePath !== undefined) {
    throw new Error(`--${flagName} and --file are mutually exclusive`);
  }
  const raw = inline ?? (filePath ? readFileSync(filePath, "utf8") : undefined);
  if (raw === undefined) {
    throw new Error(
      `Provide the request body via --${flagName} '<json>' or --file <path>`,
    );
  }
  try {
    return JSON.parse(raw);
  } catch {
    const source =
      inline !== undefined ? `--${flagName}` : `--file (${filePath ?? ""})`;
    throw new Error(`${source} must be valid JSON`);
  }
}
