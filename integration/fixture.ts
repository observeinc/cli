import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "@dotenvx/dotenvx";
import { $ } from "bun";
import { test } from "bun:test";
import { type Config, ConfigSchema } from "../src/lib/config.ts";

const INTEGRATION_ENV = {
  CUSTOMER: "OBSERVE_INTEGRATION_CUSTOMER",
  DOMAIN: "OBSERVE_INTEGRATION_DOMAIN",
  API_TOKEN: "OBSERVE_INTEGRATION_API_TOKEN",
} as const;

const TEST_RESOURCE_PREFIX = "cli";

const integrationDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(integrationDir, "..");
const cliEntrypoint = join(projectRoot, "src/bin.ts");

loadIntegrationDotenv();

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Run a test only in CI when it depends on tenant-specific fixtures.
 * Skipped locally so the rest of the suite runs against any tenant.
 * See integration/README.md.
 */
export const testCiOnly = process.env.CI === "true" ? test : test.skip;

/** Per-test timeout tiers for integration tests. See integration/README.md. */
export const INTEGRATION_TIMEOUT = {
  /** CRUD and read-only; `test:integration` script default matches this tier. */
  default: 10_000,
  /** Graph rebuild (dataset/datastream creation). */
  graphRebuild: 30_000,
  /** Poll until queryable or ingested after creation. */
  materialization: 90_000,
} as const;

/** Poll budget for materialization-tier tests; keep below `INTEGRATION_TIMEOUT.materialization`. */
export const MATERIALIZATION_POLL_TIMEOUT_MS = 80_000;

/**
 * Unique prefix for resource names in a test (e.g. `cli-a1b2c3d4`).
 * See integration/README.md.
 */
export function testPrefix(): string {
  return `${TEST_RESOURCE_PREFIX}-${randomUUID().slice(0, 8)}`;
}

/**
 * Run a test body with a fresh fixture, safe for concurrent tests.
 * See integration/README.md.
 */
export async function withIntegrationFixture(
  tenant: Config,
  fn: (fixture: IntegrationFixture) => Promise<void>,
): Promise<void> {
  const fixture = new IntegrationFixture(tenant);
  try {
    await fn(fixture);
  } finally {
    await fixture.cleanup();
  }
}

export type CleanupFn = () => void | Promise<void>;

export class IntegrationFixture {
  readonly tenant: Config;
  readonly tempHome: string;
  readonly env: NodeJS.ProcessEnv;
  private readonly cleanups: CleanupFn[] = [];

  constructor(tenant: Config) {
    this.tenant = tenant;
    this.tempHome = mkdtempSync(join(tmpdir(), "observe-cli-integration-"));
    writeTenantConfig(this.tempHome, tenant);
    this.env = {
      ...process.env,
      HOME: this.tempHome,
      OBSERVE_CLI_EXPERIMENTAL: "1",
      OBSERVE_NO_UPDATE_NOTIFIER: "1",
      NO_COLOR: "1",
    };
  }

  /** Tagged template: write a shell-style `observe …` command; requires the `observe` prefix. */
  runCli = async (
    strings: TemplateStringsArray,
    ...values: readonly unknown[]
  ): Promise<CliResult> => {
    const command = String.raw(
      { raw: strings.raw },
      ...values.map((value) => String(value)),
    );
    const argsPart = stripObserveCliArgs(command);

    const result = await $`bun ${cliEntrypoint} ${{ raw: argsPart }}`
      .env(this.env)
      .cwd(projectRoot)
      .nothrow()
      .quiet();

    return {
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
      exitCode: result.exitCode,
    };
  };

  /** Register teardown to run when the fixture is cleaned up (LIFO order). */
  registerCleanup(fn: CleanupFn): void {
    this.cleanups.push(fn);
  }

  async cleanup(): Promise<void> {
    for (const fn of [...this.cleanups].reverse()) {
      try {
        await fn();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`integration cleanup failed: ${message}`);
      }
    }
    this.cleanups.length = 0;
    rmSync(this.tempHome, { recursive: true, force: true });
  }
}

/**
 * Repeatedly run `fn` until `isReady` returns true, or throw after timeout.
 * Catch and re-throw at the call site to attach test-specific context.
 */
export async function retryUntil<T>(
  fn: () => Promise<T>,
  isReady: (value: T) => boolean,
  options: {
    timeoutMs?: number;
    intervalMs?: number;
  } = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const intervalMs = options.intervalMs ?? 500;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const value = await fn();
    if (isReady(value)) {
      return value;
    }
    await Bun.sleep(intervalMs);
  }

  throw new Error(`retryUntil timed out after ${String(timeoutMs)}ms`);
}

export function parseJsonOutput(result: CliResult): unknown {
  if (result.exitCode !== 0) {
    throw new Error(
      `CLI exited with code ${String(result.exitCode)}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }

  try {
    return JSON.parse(result.stdout.trim()) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to parse CLI JSON output: ${message}\nstdout:\n${result.stdout}`,
      {
        cause: error,
      },
    );
  }
}

/**
 * Load tenant credentials from the environment (including `.env` when present).
 *
 * Required: OBSERVE_INTEGRATION_CUSTOMER, OBSERVE_INTEGRATION_DOMAIN,
 * OBSERVE_INTEGRATION_API_TOKEN
 */
export function loadTenantConfig(): Config {
  const customerId = process.env[INTEGRATION_ENV.CUSTOMER];
  const domain = process.env[INTEGRATION_ENV.DOMAIN];
  const token = process.env[INTEGRATION_ENV.API_TOKEN];

  if (!customerId || !domain || !token) {
    throw new Error(
      `${INTEGRATION_ENV.CUSTOMER}, ${INTEGRATION_ENV.DOMAIN}, and ${INTEGRATION_ENV.API_TOKEN} must be set for integration tests`,
    );
  }

  return ConfigSchema.parse({ customerId, domain, token });
}

/** Thrown when a test author passes a malformed command to `runCli`. */
export class InvalidCliCommandError extends Error {
  override readonly name = "InvalidCliCommandError";

  constructor(message: string) {
    super(`Invalid integration test CLI command: ${message}`);
  }
}

function loadIntegrationDotenv(): void {
  const envPath = join(projectRoot, ".env");
  if (!existsSync(envPath)) {
    return;
  }
  config({ path: envPath, quiet: true });
}

function stripObserveCliArgs(command: string): string {
  const trimmed = command.trim();
  if (trimmed.length === 0) {
    throw new InvalidCliCommandError("command is empty");
  }

  if (!/^observe(?:\s|$)/.test(trimmed)) {
    throw new InvalidCliCommandError('command must start with "observe"');
  }

  const argsPart = trimmed.slice("observe".length).trimStart();
  if (argsPart.length === 0) {
    throw new InvalidCliCommandError(
      'command must include subcommand after "observe"',
    );
  }

  return argsPart;
}

function writeTenantConfig(homeDir: string, tenant: Config): void {
  const configDir = join(homeDir, ".observe");
  mkdirSync(configDir, { recursive: true, mode: 0o700 });

  writeFileSync(
    join(configDir, "config.json"),
    JSON.stringify(ConfigSchema.parse(tenant), null, 2),
    { mode: 0o600 },
  );
}
