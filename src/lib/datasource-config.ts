import { readFileSync } from "node:fs";
import type { DatasourceConfigInput } from "../gql/generated/graphql.js";

/**
 * Resolves --config / --config-file (mutually exclusive) into a parsed object.
 * Throws on invalid JSON, missing file, or both flags set.
 */
export function loadDatasourceConfig(
  inline: string | undefined,
  filePath: string | undefined,
): DatasourceConfigInput | undefined {
  if (inline !== undefined && filePath !== undefined) {
    throw new Error("--config and --config-file are mutually exclusive");
  }
  const raw = inline ?? (filePath ? readFileSync(filePath, "utf8") : undefined);
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw) as DatasourceConfigInput;
  } catch {
    const source =
      inline !== undefined ? "--config" : `--config-file (${filePath ?? ""})`;
    throw new Error(`${source} must be a valid JSON object`);
  }
}
