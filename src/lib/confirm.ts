import { createInterface } from "node:readline/promises";
import type { LocalContext } from "../context";

/** Ask a yes/no question on the terminal; no TTY means no. */
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
