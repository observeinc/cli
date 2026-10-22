import { createInterface } from "node:readline/promises";
import type { LocalContext } from "../../context";
import { ResponseError } from "../../rest/generated/runtime";

export type OutputFormat = "json" | "csv";

export async function confirm(
  this: LocalContext,
  question: string,
): Promise<boolean> {
  const { process } = this;
  if (!process.stdin.isTTY) {
    return false;
  }
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const answer = await rl.question(`${question} [y/N] `);
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

/**
 * Destructive commands prompt on stdout and print their warnings with the
 * status writer, both of which would corrupt or hide output under --json.
 * Returns false (and sets the exit code) when --json is set without --yes.
 */
export function requireYesWithJson(
  this: LocalContext,
  flags: { yes?: boolean; json?: boolean },
): boolean {
  if (flags.json && !flags.yes) {
    this.writer.error(
      "--json needs --yes: this command asks for confirmation, which cannot be answered with JSON output.",
    );
    this.process.exitCode = 1;
    return false;
  }
  return true;
}

/** The `type` field of a REST error body, if there is one. */
export async function errorType(error: unknown): Promise<string | undefined> {
  if (!(error instanceof ResponseError)) return undefined;
  try {
    const parsed: unknown = JSON.parse(await error.response.clone().text());
    if (parsed != null && typeof parsed === "object") {
      const type = (parsed as Record<string, unknown>).type;
      return typeof type === "string" ? type : undefined;
    }
  } catch {
    // not JSON
  }
  return undefined;
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ResponseError && error.response.status === 404;
}

export const MIN_LIMIT = 1;
export const MAX_LIMIT = 100;
export const DEFAULT_LIMIT = 100;

export function parseLimit(value: string): number {
  const num = Number(value);
  if (!Number.isInteger(num) || num < MIN_LIMIT || num > MAX_LIMIT) {
    throw new Error(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`);
  }
  return num;
}
