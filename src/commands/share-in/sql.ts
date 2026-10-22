import type { SetupSqlStep } from "../../rest/share-in/types";

/** The placeholder the server uses in setup SQL for the customer's share. */
export const SHARE_NAME_PLACEHOLDER = "<your_share_name>";

const UNQUOTED_NAME = /^[A-Za-z0-9_$]+$/;

/**
 * Validate a share name the same way the server does: an unquoted
 * identifier, or a double-quoted one without `"` or `\` inside. Returns the
 * trimmed name, spelled as the user wrote it, for use in SQL.
 */
export function parseShareName(value: string): string {
  const name = value.trim();
  if (name.length >= 2 && name.startsWith('"') && name.endsWith('"')) {
    const inner = name.slice(1, -1);
    if (inner && !/["\\]/.test(inner)) return name;
  } else if (UNQUOTED_NAME.test(name)) {
    return name;
  }
  throw new Error(
    `Invalid share name "${value}". Use letters, digits, _ and $, or a double-quoted name.`,
  );
}

/**
 * Quote a value for a command line the user copies into a POSIX shell, so
 * that double-quoted share names keep their quotes and `$` is not expanded.
 */
export function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_.-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/** Fill the share-name placeholder in server-provided SQL, when known. */
export function withShareName(
  steps: SetupSqlStep[],
  shareName: string | undefined,
): SetupSqlStep[] {
  if (!shareName) return steps;
  return steps.map((step) => ({
    description: step.description,
    sql: step.sql.split(SHARE_NAME_PLACEHOLDER).join(shareName),
  }));
}

export function writeSteps(
  write: (text: string) => void,
  steps: SetupSqlStep[],
  style: { bold: (s: string) => string; sql: (s: string) => string },
): void {
  steps.forEach((step, i) => {
    write("");
    write(style.bold(`${i + 1}. ${step.description}`));
    for (const line of step.sql.split("\n")) {
      write(`   ${style.sql(line)}`);
    }
  });
}
