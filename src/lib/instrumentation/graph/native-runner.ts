import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ALLOWED = new Set(["cargo", "go", "mvn"]);

export interface NativeRunResult {
  stdout: string;
  stderr: string;
  status: number;
  /** Why the process could not run or finish (not installed, timed out). */
  error?: string;
}

/** Run one allowlisted resolver without a shell, network, or repository writes. */
export function runNativeResolver({
  executable,
  args,
  cwd,
  timeoutMs = 30_000,
}: {
  executable: "cargo" | "go" | "mvn";
  args: string[];
  cwd: string;
  timeoutMs?: number;
}): NativeRunResult {
  if (!ALLOWED.has(executable))
    throw new Error(`Resolver is not allowlisted: ${executable}`);
  const before = repositoryFingerprint(cwd);
  const result = spawnSync(executable, args, {
    cwd,
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: 25 * 1024 * 1024,
    shell: false,
    env: {
      ...process.env,
      GOPROXY: "off",
      GOSUMDB: "off",
      GOTOOLCHAIN: "local",
      GOFLAGS: "-mod=readonly",
      CARGO_NET_OFFLINE: "true",
      MAVEN_OPTS: `${process.env.MAVEN_OPTS ?? ""} -Daether.connector.basic.threads=1`,
    },
  });
  const after = repositoryFingerprint(cwd);
  if (before !== after)
    throw new Error(
      `${executable} modified the project while resolving dependencies`,
    );
  const code =
    result.error != null && "code" in result.error
      ? String(result.error.code)
      : undefined;
  const error =
    code === "ENOENT"
      ? `${executable} is not installed or not on PATH`
      : code === "ETIMEDOUT"
        ? `timed out after ${String(timeoutMs / 1000)}s`
        : result.error?.message;
  return {
    stdout: typeof result.stdout === "string" ? result.stdout : "",
    stderr: typeof result.stderr === "string" ? result.stderr : "",
    status: result.status ?? 1,
    ...(error == null ? {} : { error }),
  };
}

function repositoryFingerprint(root: string) {
  const hash = createHash("sha256");
  const stack = [root];
  while (stack.length > 0) {
    const directory = stack.pop();
    if (directory == null) break;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (
        [".git", "node_modules", "target", "build", ".gradle"].includes(
          entry.name,
        )
      )
        continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) stack.push(path);
      else if (entry.isFile()) {
        const stat = statSync(path);
        hash.update(`${relative(root, path)}:${stat.size}:${stat.mtimeMs}\n`);
      }
    }
  }
  return hash.digest("hex");
}
