/**
 * Shared unit-test helpers for CLI command handlers.
 *
 * Not a test file itself (no `*.test.ts` suffix, so the runner ignores it) and
 * not part of the shipped bundle (nothing in the `bin.ts` entry graph imports
 * it). Command tests import these to avoid re-declaring the same mock context
 * and color-suppression boilerplate in every file.
 */
import { afterAll, beforeAll } from "bun:test";
import type { LocalContext } from "./context";
import { createWriter } from "./lib/writer";

interface MockProcess {
  env: Record<string, string | undefined>;
  execPath?: string;
  /** Set by `process.exit(code)` or by handlers that assign `process.exitCode`. */
  exitCode: number | undefined;
  stdout: { write: (msg: string) => boolean };
  stderr: { write: (msg: string) => boolean };
  exit: (code?: number) => never;
}

export interface MockCliContext {
  /** The LocalContext to pass as `this` to a handler. */
  context: LocalContext;
  /** Lines written to stdout, in order. */
  stdout: string[];
  /** Lines written to stderr, in order. */
  stderr: string[];
  /** The mock process, exposed for direct assertions (e.g. on `exitCode`). */
  process: MockProcess;
  /** Exit code from either `process.exit(code)` or `process.exitCode = code`. */
  getExitCode: () => number | undefined;
}

/**
 * Build a mock `LocalContext` that captures stdout/stderr and records the exit
 * code. `process.exit()` throws `Error("process.exit")` so tests can assert the
 * handler bailed out (wrap the call in try/catch).
 */
export function createMockContext(
  options: {
    env?: Record<string, string | undefined>;
    execPath?: string;
  } = {},
): MockCliContext {
  const stdout: string[] = [];
  const stderr: string[] = [];

  const processMock: MockProcess = {
    env: options.env ?? {},
    execPath: options.execPath,
    exitCode: undefined,
    stdout: {
      write: (msg: string) => {
        stdout.push(msg);
        return true;
      },
    },
    stderr: {
      write: (msg: string) => {
        stderr.push(msg);
        return true;
      },
    },
    exit: (code?: number): never => {
      processMock.exitCode = code ?? 0;
      throw new Error("process.exit");
    },
  };

  const context = {
    process: processMock,
    writer: createWriter({ process: processMock }),
  } as unknown as LocalContext;

  return {
    context,
    stdout,
    stderr,
    process: processMock,
    getExitCode: () => processMock.exitCode,
  };
}

/**
 * Force chalk into no-color mode for the duration of the suite so string
 * assertions don't have to account for ANSI escapes, restoring the prior env
 * afterward. Call once at the top level of a test file (before any `beforeAll`
 * that imports the handler under test, so the env is set first).
 */
export function suppressAnsiColor(): void {
  let previousNoColor: string | undefined;
  let previousForceColor: string | undefined;

  beforeAll(() => {
    previousNoColor = process.env.NO_COLOR;
    previousForceColor = process.env.FORCE_COLOR;
    process.env.NO_COLOR = "1";
    process.env.FORCE_COLOR = "0";
  });

  afterAll(() => {
    if (previousNoColor === undefined) delete process.env.NO_COLOR;
    else process.env.NO_COLOR = previousNoColor;
    if (previousForceColor === undefined) delete process.env.FORCE_COLOR;
    else process.env.FORCE_COLOR = previousForceColor;
  });
}
