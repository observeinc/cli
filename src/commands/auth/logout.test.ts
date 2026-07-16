import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../test-helpers";
import type { Config } from "../../lib/config";
import { run, type LogoutDeps } from "./logout";

let configPresent: boolean;
let configToLoad: Config;
let deleteError: Error | null;

const configExistsFn = mock(() => configPresent);
const loadConfigFn = mock(() => configToLoad);
const deleteConfigFn = mock(() => true);
const deleteAuthtokenFn = mock((_config: unknown, _variables: unknown) => {
  if (deleteError) throw deleteError;
  return Promise.resolve(true);
});

const deps: LogoutDeps = {
  configExists: configExistsFn,
  loadConfig: loadConfigFn,
  deleteConfig: deleteConfigFn,
  deleteAuthtoken: deleteAuthtokenFn,
};

beforeEach(() => {
  configPresent = true;
  configToLoad = {
    customerId: "123456789012",
    token: "sekret-token-value",
    domain: "observeinc.com",
    tokenId: "tok-abc",
  };
  deleteError = null;
  configExistsFn.mockClear();
  loadConfigFn.mockClear();
  deleteConfigFn.mockClear();
  deleteAuthtokenFn.mockClear();
});

suppressAnsiColor();

describe("auth logout", () => {
  test("is a no-op when no credentials are stored", async () => {
    configPresent = false;
    const { context, stdout } = createMockContext();
    await run.call(context, {}, deps);
    expect(stdout.join("")).toContain("Already logged out");
    expect(deleteAuthtokenFn).not.toHaveBeenCalled();
    expect(deleteConfigFn).not.toHaveBeenCalled();
  });

  test("revokes the token and deletes local credentials", async () => {
    const { context, stdout } = createMockContext();
    await run.call(context, {}, deps);

    expect(deleteAuthtokenFn).toHaveBeenCalledTimes(1);
    const [, vars] = deleteAuthtokenFn.mock.calls[0]!;
    expect(vars).toMatchObject({ id: "tok-abc" });
    expect(deleteConfigFn).toHaveBeenCalledTimes(1);
    expect(stdout.join("")).toContain(
      'Logged out from profile "default" successfully',
    );
  });

  test("skips revocation when there is no token id", async () => {
    configToLoad = { ...configToLoad, tokenId: undefined };
    const { context, stdout } = createMockContext();
    await run.call(context, {}, deps);

    expect(deleteAuthtokenFn).not.toHaveBeenCalled();
    expect(deleteConfigFn).toHaveBeenCalledTimes(1);
    expect(stdout.join("")).toContain(
      'Logged out from profile "default" successfully',
    );
  });

  test("still logs out locally when server revocation fails", async () => {
    deleteError = new Error("network down");
    const { context, stdout } = createMockContext();
    await run.call(context, {}, deps);

    expect(deleteConfigFn).toHaveBeenCalledTimes(1);
    expect(stdout.join("")).toContain(
      'Logged out from profile "default" successfully',
    );
  });

  test("success message uses profile name captured before config is deleted", async () => {
    // Simulate: getActiveProfileName returns "staging" before delete, but
    // falls back to "default" after the config file has been removed.
    let deleted = false;
    const getActiveProfileNameFn = mock(() =>
      deleted ? "default" : "staging",
    );
    const deleteConfigWithSideEffect = mock(() => {
      deleted = true;
      return true;
    });

    const { context, stdout } = createMockContext();
    await run.call(
      context,
      {},
      {
        ...deps,
        deleteConfig: deleteConfigWithSideEffect,
        getActiveProfileName: getActiveProfileNameFn,
      },
    );

    expect(stdout.join("")).toContain(
      'Logged out from profile "staging" successfully',
    );
  });
});
