/** Output shared by `skill install` and `skill update`. */
import { dirname, relative, sep } from "node:path";
import type { SkippedTarget } from "../../lib/skills/install-target";
import type { Writer } from "../../lib/writer";

/** Where the run is anchored, for rendering paths. */
export interface PathContext {
  home: string;
  cwd: string;
  project: boolean;
}

/**
 * A path shown to the user: relative to the repo (`./…`) in project mode, or
 * home-anchored (`~/…`) otherwise, with POSIX separators. Falls back to the
 * absolute path when it lies outside the anchor.
 */
export function displayPath(
  p: string,
  { home, cwd, project }: PathContext,
): string {
  const anchor = project ? cwd : home;
  const prefix = project ? "./" : "~/";
  const rel = relative(anchor, p);
  return rel && !rel.startsWith("..")
    ? `${prefix}${rel.split(sep).join("/")}`
    : p;
}

/**
 * Report the agent skills directories that could not be written. Every skill in
 * a run hits the same ones, so entries are deduplicated by directory.
 */
export function warnSkippedTargets(
  writer: Writer,
  skipped: SkippedTarget[],
  paths: PathContext,
): void {
  const byDir = new Map<string, string>();
  for (const s of skipped) {
    const dir = dirname(s.path);
    if (!byDir.has(dir)) byDir.set(dir, s.reason);
  }
  if (byDir.size === 0) return;

  const noun = byDir.size === 1 ? "directory" : "directories";
  writer.warn(
    `Skipped ${byDir.size} agent ${noun} that could not be written:\n` +
      [...byDir]
        .map(
          ([dir, reason]) =>
            `    ${displayPath(dir, paths)} — ${shortReason(reason)}`,
        )
        .join("\n"),
  );
}

/**
 * Drop the trailing syscall and path from `EACCES: permission denied, mkdir
 * '<path>'`, which only repeat the path already on the line. Other messages are
 * shown whole.
 */
function shortReason(reason: string): string {
  const [errnoClause] = /^E[A-Z0-9]+: [^,]+,/.exec(reason) ?? [];
  return errnoClause ? errnoClause.slice(0, -1) : reason;
}

/**
 * Build the failure reporter for a run: an error that sets exit 1, or under
 * `bestEffort` a warning that leaves the run looking successful.
 */
export function makeFail({
  writer,
  process,
  bestEffort,
}: {
  writer: Writer;
  process: Pick<NodeJS.Process, "exitCode">;
  bestEffort: boolean;
}): (detail: string) => void {
  return (detail) => {
    const message = `Could not install skills: ${detail}`;
    if (bestEffort) {
      writer.warn(message);
      return;
    }
    writer.error(`Error: ${message}`);
    process.exitCode = 1;
  };
}
