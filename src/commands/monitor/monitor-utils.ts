import chalk from "chalk";
import { MonitorRuleKind, type MonitorV2RuleKind } from "../../rest/generated";

export function ruleKindColor(
  kind: MonitorRuleKind | MonitorV2RuleKind | undefined,
): string {
  if (!kind) return chalk.dim("-");
  switch (kind) {
    case MonitorRuleKind.Threshold:
      return chalk.cyan(kind);
    case MonitorRuleKind.Count:
      return chalk.green(kind);
    case MonitorRuleKind.Promote:
      return chalk.magenta(kind);
    case MonitorRuleKind.Anomaly:
      return chalk.yellow(kind);
    case MonitorRuleKind.Composite:
      return chalk.blue(kind);
    default:
      return chalk.dim(kind);
  }
}
