/**
 * Extracts a preview of failing tests from a Bun JUnit XML report.
 *
 * Usage: bun run scripts/failed-tests-preview.ts <junit.xml> [maxPreview]
 *
 * Prints one failing test per line (formatted "<describe> › <test>"), deduped
 * and capped at maxPreview (default 5) with a trailing "… and N more". Used by
 * the integration-test workflow to include failing tests in the Slack alert.
 */
import { readFileSync } from "node:fs";

const DEFAULT_MAX_PREVIEW = 5;

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function attr(attrs: string, name: string): string {
  const match = new RegExp(`\\b${name}="([^"]*)"`).exec(attrs);
  return match?.[1] ? decodeEntities(match[1]) : "";
}

function failingTests(xml: string): string[] {
  const names: string[] = [];
  // Match either a self-closed <testcase .../> (always passing — no children)
  // or a paired <testcase ...>...</testcase>; only the latter can hold a
  // <failure>/<error> child.
  for (const match of xml.matchAll(
    /<testcase\b([^>]*?)(?:\/>|>(.*?)<\/testcase>)/gs,
  )) {
    const body = match[2];
    if (!body || !/<(failure|error)\b/.test(body)) continue;
    const attrs = match[1] ?? "";
    const name = attr(attrs, "name");
    const classname = attr(attrs, "classname");
    names.push(classname ? `${classname} › ${name}` : name);
  }
  return [...new Set(names)];
}

const path = process.argv[2];
if (!path) {
  console.error("usage: failed-tests-preview.ts <junit.xml> [maxPreview]");
  process.exit(2);
}

const maxArg = process.argv[3];
const maxPreview =
  maxArg !== undefined ? Number.parseInt(maxArg, 10) : DEFAULT_MAX_PREVIEW;
if (!Number.isInteger(maxPreview) || maxPreview < 1) {
  console.error(`invalid maxPreview: ${String(maxArg)}`);
  process.exit(2);
}

let xml: string;
try {
  xml = readFileSync(path, "utf8");
} catch {
  // No report (e.g. tests crashed before writing) — emit nothing so the Slack
  // section is omitted rather than the workflow erroring.
  process.exit(0);
}

const failed = failingTests(xml);
const preview =
  failed.length > maxPreview
    ? [
        ...failed.slice(0, maxPreview),
        `… and ${String(failed.length - maxPreview)} more`,
      ]
    : failed;

if (preview.length > 0) console.log(preview.join("\n"));
