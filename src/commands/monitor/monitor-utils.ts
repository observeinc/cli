import chalk from "chalk";
import { MonitorRuleKind } from "../../rest/generated";

export function ruleKindColor(kind: MonitorRuleKind | undefined): string {
  if (!kind) return chalk.dim("-");
  switch (kind) {
    case MonitorRuleKind.Threshold:
      return chalk.cyan(kind);
    case MonitorRuleKind.Count:
      return chalk.green(kind);
    case MonitorRuleKind.Promote:
      return chalk.magenta(kind);
    default:
      return chalk.dim(kind);
  }
}
