import { CURRENT_CLI_VERSION, GITHUB_REPO } from "../../constants";
import { RULES, type Finding } from "../findings";

const SARIF_LEVEL = {
  info: "note",
  warning: "warning",
  error: "error",
} as const;

/**
 * Render findings as a SARIF 2.1.0 log so GitHub code scanning and other
 * SARIF consumers can annotate pull requests. One rule per `ruleId`, one
 * result per finding.
 */
export function toSarif({
  findings,
  root,
  manifestSha256,
}: {
  findings: Finding[];
  root: string;
  manifestSha256: string;
}) {
  const usedRules = [...new Set(findings.map((f) => f.ruleId))].sort();
  return {
    $schema:
      "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "observe-instrumentation-audit",
            version: CURRENT_CLI_VERSION,
            informationUri: `https://github.com/${GITHUB_REPO}`,
            properties: { otelSupportManifestSha256: manifestSha256 },
            rules: usedRules.map((ruleId) => ({
              id: ruleId,
              name: ruleId,
              shortDescription: { text: RULES[ruleId].title },
              defaultConfiguration: {
                level: SARIF_LEVEL[RULES[ruleId].severity],
              },
            })),
          },
        },
        originalUriBaseIds: { ROOT: { uri: `file://${root}/` } },
        results: findings.map((finding) => ({
          ruleId: finding.ruleId,
          level: SARIF_LEVEL[finding.severity],
          message: { text: `${finding.message}. ${finding.fix}.` },
          locations: [
            {
              physicalLocation: {
                artifactLocation: {
                  uri: finding.path,
                  uriBaseId: "ROOT",
                },
              },
            },
          ],
          partialFingerprints: {
            candidateId: finding.candidateId,
            ...(finding.package == null ? {} : { package: finding.package }),
          },
        })),
      },
    ],
  };
}
