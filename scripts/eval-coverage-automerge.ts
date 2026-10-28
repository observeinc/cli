/**
 * Decide whether a PR may be auto-merged as the eval-coverage counts bot.
 *
 * The workflow never checks out the PR head. It asks this gate, waits for
 * the CI test check on that SHA, then `gh pr merge --squash
 * --match-head-commit`. Forks, other authors, extra files, or a missing
 * label are a skip, not a failure, so a human PR cannot be merged this way.
 */

export const BOT_LOGIN = "observe-ai-automation[bot]";
export const PR_LABEL = "eval-coverage";
export const PR_BRANCH = "bot/eval-coverage";
export const COUNTS_FILE = "scripts/eval-coverage.json";

export interface MergeGate {
  repo: string;
  headRepo: string;
  headRef: string;
  author: string;
  labels: string[];
  files: string[];
}

/** Why the PR must not be merged, or undefined when it may. */
export function refuseReason(g: MergeGate): string | undefined {
  if (g.headRepo !== g.repo) return `head is ${g.headRepo}, not ${g.repo}`;
  if (g.author !== BOT_LOGIN) return `author is ${g.author}, not ${BOT_LOGIN}`;
  if (g.headRef !== PR_BRANCH) return `head is ${g.headRef}, not ${PR_BRANCH}`;
  if (!g.labels.includes(PR_LABEL)) return `missing ${PR_LABEL} label`;
  if (g.files.length !== 1 || g.files[0] !== COUNTS_FILE)
    return `files are ${g.files.join(", ") || "(none)"}`;
  return undefined;
}

function arg(argv: string[], flag: string): string | undefined {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}

function args(argv: string[], flag: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const next = argv[i + 1];
    if (argv[i] === flag && next !== undefined) {
      out.push(next);
      i++;
    }
  }
  return out;
}

export function main(argv: string[]): number {
  const repo = arg(argv, "--repo");
  const headRepo = arg(argv, "--head-repo");
  const headRef = arg(argv, "--head-ref");
  const author = arg(argv, "--author");
  if (!repo || !headRepo || !headRef || !author) {
    console.error(
      "usage: eval-coverage-automerge --repo OWNER/NAME --head-repo OWNER/NAME --head-ref REF --author LOGIN [--label NAME]... [--file PATH]...",
    );
    return 1;
  }
  const reason = refuseReason({
    repo,
    headRepo,
    headRef,
    author,
    labels: args(argv, "--label"),
    files: args(argv, "--file"),
  });
  if (reason) {
    console.log(`skip: ${reason}`);
    return 2;
  }
  console.log("ok");
  return 0;
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
