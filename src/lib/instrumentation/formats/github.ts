import type { Finding } from "../findings";

const COMMAND = { info: "notice", warning: "warning", error: "error" } as const;

/** Escape a value for a GitHub Actions workflow command property. */
function escapeProperty(value: string) {
  return value
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A")
    .replace(/:/g, "%3A")
    .replace(/,/g, "%2C");
}

/** Escape a value for a GitHub Actions workflow command message. */
function escapeMessage(value: string) {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

/**
 * Render findings as GitHub Actions workflow commands so they appear as
 * annotations on the pull request without code scanning.
 */
export function toGithubAnnotations(findings: Finding[]) {
  return findings
    .map(
      (finding) =>
        `::${COMMAND[finding.severity]} file=${escapeProperty(finding.path)},title=${escapeProperty(finding.ruleId)}::${escapeMessage(`${finding.message}. ${finding.fix}.`)}`,
    )
    .join("\n");
}
