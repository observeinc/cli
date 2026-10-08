import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  accessSync,
  constants,
  readdirSync,
  realpathSync,
  statSync,
} from "node:fs";
import { delimiter, isAbsolute, join, relative } from "node:path";

const ALLOWED = new Set(["cargo", "go"]);

/**
 * The only variables a resolver inherits. Anything else in the user's or CI
 * job's environment (tokens, cloud credentials) stays out of a build that the
 * scanned repository controls.
 */
const INHERITED_ENV = [
  "PATH",
  "HOME",
  "USERPROFILE",
  "SystemRoot",
  "LOCALAPPDATA",
  "APPDATA",
  "TEMP",
  "TMP",
  "TMPDIR",
  "XDG_CACHE_HOME",
  "XDG_CONFIG_HOME",
  "GOROOT",
  "GOPATH",
  "GOMODCACHE",
  "GOCACHE",
  "CARGO_HOME",
  "RUSTUP_HOME",
  "RUSTUP_TOOLCHAIN",
];

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
  root,
  timeoutMs = 30_000,
}: {
  executable: "cargo" | "go";
  args: string[];
  cwd: string;
  /** Project root; an executable found inside it is refused. */
  root: string;
  timeoutMs?: number;
}): NativeRunResult {
  if (!ALLOWED.has(executable))
    throw new Error(`Resolver is not allowlisted: ${executable}`);
  const lookup = findExecutable({ executable, root });
  if ("error" in lookup)
    return { stdout: "", stderr: "", status: 1, error: lookup.error };
  const before = repositoryFingerprint(cwd);
  const result = spawnSync(lookup.path, args, {
    cwd,
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: 25 * 1024 * 1024,
    shell: false,
    env: {
      ...inheritedEnv(),
      GOPROXY: "off",
      GOSUMDB: "off",
      GOTOOLCHAIN: "local",
      GOFLAGS: "-mod=readonly",
      CARGO_NET_OFFLINE: "true",
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

function inheritedEnv() {
  const env: Record<string, string> = {};
  for (const name of INHERITED_ENV) {
    const value = process.env[name];
    if (value != null) env[name] = value;
  }
  return env;
}

/**
 * Resolve `executable` to an absolute path from PATH so the spawn never
 * searches the working directory, which is the scanned repository. Relative
 * PATH entries are ignored, and a match inside `root` is refused rather than
 * skipped. On Windows only `.exe` is accepted: batch files cannot be spawned
 * without a shell.
 */
export function findExecutable({
  executable,
  root,
  searchPath = process.env.PATH ?? "",
}: {
  executable: string;
  root: string;
  searchPath?: string;
}): { path: string } | { error: string } {
  const file = process.platform === "win32" ? `${executable}.exe` : executable;
  for (const entry of searchPath.split(delimiter)) {
    const directory = entry.replace(/^"(.*)"$/, "$1");
    if (directory === "" || !isAbsolute(directory)) continue;
    const path = runnablePath(join(directory, file));
    if (path == null) continue;
    if (isInside(path, realpathSync(root)))
      return {
        error: `${executable} on PATH resolves to ${path}, inside the project; refusing to run it`,
      };
    return { path };
  }
  return { error: `${executable} is not installed or not on PATH` };
}

function runnablePath(path: string) {
  try {
    const real = realpathSync(path);
    if (!statSync(real).isFile()) return undefined;
    if (process.platform !== "win32") accessSync(real, constants.X_OK);
    return real;
  } catch {
    return undefined;
  }
}

function isInside(path: string, root: string) {
  const fromRoot = relative(root, path);
  return fromRoot !== "" && !fromRoot.startsWith("..") && !isAbsolute(fromRoot);
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
