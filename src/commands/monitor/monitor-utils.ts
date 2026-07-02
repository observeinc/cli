import chalk from "chalk";
import { MonitorV2RuleKind } from "../../rest/generated";

export function ruleKindColor(kind: MonitorV2RuleKind | undefined): string {
  if (!kind) return chalk.dim("-");
  switch (kind) {
    case MonitorV2RuleKind.Threshold:
      return chalk.cyan(kind);
    case MonitorV2RuleKind.Count:
      return chalk.green(kind);
    case MonitorV2RuleKind.Promote:
      return chalk.magenta(kind);
    default:
      return chalk.dim(kind);
  }
}
