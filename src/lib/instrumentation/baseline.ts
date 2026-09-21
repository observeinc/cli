import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";
import { findingKey, type Finding } from "./findings";

export const DEFAULT_BASELINE_PATH = ".observe/instrumentation-baseline.json";
const BASELINE_SCHEMA_VERSION = 2 as const;

export interface Baseline {
  schemaVersion: typeof BASELINE_SCHEMA_VERSION;
  generatedAt: string;
  /** Keys from `findingKey`, sorted. */
  findings: string[];
}

/** Read a baseline file; returns null when it does not exist. */
export function loadBaseline(path: string): Baseline | null {
  if (!existsSync(path)) return null;
  try {
    return z
      .object({
        schemaVersion: z.literal(BASELINE_SCHEMA_VERSION),
        generatedAt: z.string(),
        findings: z.array(z.string()),
      })
      .parse(JSON.parse(readFileSync(path, "utf8")));
  } catch (error) {
    throw new Error(
      `Unrecognized baseline file: ${path}; regenerate with --update-baseline (schema version 2)`,
      { cause: error },
    );
  }
}

export function writeBaseline(path: string, findings: Finding[]) {
  const baseline: Baseline = {
    schemaVersion: BASELINE_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    findings: [...new Set(findings.map(findingKey))].sort(),
  };
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
  return baseline;
}

/** Split findings into those the baseline accepts and those that are new. */
export function applyBaseline(findings: Finding[], baseline: Baseline | null) {
  if (baseline == null)
    return { active: findings, suppressed: [] as Finding[] };
  const accepted = new Set(baseline.findings);
  const active: Finding[] = [];
  const suppressed: Finding[] = [];
  for (const finding of findings)
    (accepted.has(findingKey(finding)) ? suppressed : active).push(finding);
  return { active, suppressed };
}
