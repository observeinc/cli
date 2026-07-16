import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../test-helpers";
import type { Config } from "../../lib/config";
import { GqlApiError } from "../../gql/gql-request";
import { status, type StatusDeps } from "./status";

const CONFIG: Config = {
  customerId: "123456789012",
  token: "sekret-token-value",
  domain: "observeinc.com",
};

let configPresent = true;
let workspaceResult: { workspace: { id: string; label: string } | null };
let workspaceError: Error | null;

const configExistsFn = mock(() => configPresent);
const loadConfigFn = mock(() => CONFIG);
const getApiBaseUrlFn = mock(
  (c: Config) => `https://${c.customerId}.${c.domain}`,
);
const getConfigPathFn = mock(() => "/home/user/.observe/config.json");
const getDefaultWorkspaceFn = mock((_config: unknown) => {
  if (workspaceError) throw workspaceError;
  return Promise.resolve(workspaceResult);
});

const deps: StatusDeps = {
  configExists: configExistsFn,
  loadConfig: loadConfigFn,
  getApiBaseUrl: getApiBaseUrlFn,
  getConfigPath: getConfigPathFn,
  getDefaultWorkspace: getDefaultWorkspaceFn,
};

beforeEach(() => {
  configPresent = true;
  workspaceResult = { workspace: { id: "ws-1", label: "Default" } };
  workspaceError = null;
  configExistsFn.mockClear();
  loadConfigFn.mockClear();
  getDefaultWorkspaceFn.mockClear();
});

suppressAnsiColor();

describe("auth status", () => {
  test("reports not-authenticated and sets exit code 1 when no config exists", async () => {
    configPresent = false;
    const { context, stderr, getExitCode } = createMockContext();
    await status.call(context, {}, deps);
    expect(stderr.join("")).toContain("Not authenticated");
    expect(getExitCode()).toBe(1);
    expect(getDefaultWorkspaceFn).not.toHaveBeenCalled();
  });

  test("emits authenticated=false JSON with --json when no config exists", async () => {
    configPresent = false;
    const { context, stdout, getExitCode } = createMockContext();
    await status.call(context, { json: true }, deps);
    expect(JSON.parse(stdout.join(""))).toEqual({
      authenticated: false,
      profile: "default",
    });
    expect(getExitCode()).toBe(1);
  });

  test("emits a valid authenticated status as JSON", async () => {
    const { context, stdout } = createMockContext();
    await status.call(context, { json: true }, deps);

    const payload = JSON.parse(stdout.join("")) as Record<string, unknown>;
    expect(payload).toMatchObject({
      authenticated: true,
      valid: true,
      customerId: "123456789012",
      domain: "observeinc.com",
      workspace: "Default",
    });
    // The raw token is never included in the status payload.
    expect(stdout.join("")).not.toContain("sekret-token-value");
  });

  test("flags an invalid token and sets exit code 1", async () => {
    workspaceError = new GqlApiError("Unauthorized", 401);
    const { context, stderr, getExitCode } = createMockContext();
    await status.call(context, {}, deps);

    expect(stderr.join("")).toContain("Authentication invalid");
    expect(getExitCode()).toBe(1);
  });
});
