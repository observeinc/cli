import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyBaseline, loadBaseline, writeBaseline } from "./baseline";
import { findingKey, type Finding } from "./findings";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

function finding(overrides: Partial<Finding>): Finding {
  return {
    ruleId: "OTEL010",
    severity: "warning",
    candidateId: "nodejs:.",
    package: "express",
    message: "m",
    fix: "f",
    path: "package.json",
    ...overrides,
  };
}

describe("baseline", () => {
  test("changed versions and scopes do not inherit an acceptance", () => {
    const known = finding({ version: "6.0.0", scope: "runtime" });
    const changed = finding({ version: "7.0.0", scope: "runtime" });
    const otherScope = finding({ version: "6.0.0", scope: "peer" });
    const baseline = {
      schemaVersion: 2 as const,
      generatedAt: "2026-09-16",
      findings: [findingKey(known)],
    };
    expect(
      applyBaseline([known, changed, otherScope], baseline).active,
    ).toEqual([changed, otherScope]);
  });

  test("malformed JSON produces a descriptive baseline error", async () => {
    const dir = mkdtempSync(join(tmpdir(), "obs-baseline-"));
    dirs.push(dir);
    const path = join(dir, "bad.json");
    await Bun.write(path, "{malformed");
    expect(() => loadBaseline(path)).toThrow("Unrecognized baseline file");
  });

  test("missing file loads as null and suppresses nothing", () => {
    const dir = mkdtempSync(join(tmpdir(), "obs-baseline-"));
    dirs.push(dir);
    const path = join(dir, ".observe", "instrumentation-baseline.json");
    expect(loadBaseline(path)).toBeNull();
    const { active, suppressed } = applyBaseline([finding({})], null);
    expect(active).toHaveLength(1);
    expect(suppressed).toHaveLength(0);
  });

  test("writes sorted unique keys and suppresses matching findings", () => {
    const dir = mkdtempSync(join(tmpdir(), "obs-baseline-"));
    dirs.push(dir);
    const path = join(dir, ".observe", "instrumentation-baseline.json");
    const known = finding({});
    writeBaseline(path, [known, known, finding({ package: "koa" })]);
    expect(existsSync(path)).toBe(true);
    const written = JSON.parse(readFileSync(path, "utf8")) as {
      findings: string[];
    };
    expect(written.findings).toEqual([
      findingKey(known),
      findingKey(finding({ package: "koa" })),
    ]);

    const fresh = finding({ package: "fastify" });
    const { active, suppressed } = applyBaseline(
      [known, fresh],
      loadBaseline(path),
    );
    expect(active).toEqual([fresh]);
    expect(suppressed).toEqual([known]);
  });

  test("rejects an unrecognized baseline file", async () => {
    const dir = mkdtempSync(join(tmpdir(), "obs-baseline-"));
    dirs.push(dir);
    const path = join(dir, "bad.json");
    await Bun.write(path, JSON.stringify({ schemaVersion: 99 }));
    expect(() => loadBaseline(path)).toThrow(/Unrecognized baseline/);
  });
});
