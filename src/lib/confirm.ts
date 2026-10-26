import * as readline from "node:readline";
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

/**
 * Build the interactive confirmation prompt for an irreversible delete.
 *
 * Anything other than `y` declines, as does Ctrl-C, so an interrupted prompt
 * is never read as consent. Callers own the non-interactive path: check for a
 * TTY (or an injected confirm function) before prompting, since there is no
 * one to answer otherwise.
 */
export function makeDeleteConfirm({
  process: proc,
  resourceKind,
}: {
  process: NodeJS.Process;
  resourceKind: string;
}) {
  return (name: string): Promise<boolean> =>
    new Promise((resolve) => {
      const rl = readline.createInterface({
        input: proc.stdin,
        output: proc.stdout,
      });
      rl.question(
        `Are you sure you want to delete ${resourceKind} "${name}"? This action is irreversible. [y/N]: `,
        (answer) => {
          rl.close();
          resolve(answer.trim().toLowerCase() === "y");
        },
      );
      rl.on("SIGINT", () => {
        rl.close();
        resolve(false);
      });
    });
}
