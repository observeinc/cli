import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../test-helpers";
import { configure, type ConfigureDeps } from "./configure";

// Config persistence is exercised in the config lib's own tests; here we inject
// spies so the handler never touches the real ~/.observe directory. The spies
// are stateful so call *order* matters: `configExists` must be read before
// `saveConfig` runs, otherwise a freshly-saved config always looks pre-existing
// (the bug this handler was fixed for).
let configPreExists = false;
let configSaved = false;
const saveConfigFn = mock((_config: unknown): void => {
  configSaved = true;
});
const getConfigPathFn = mock(() => "/home/user/.observe/config.json");
const configExistsFn = mock(() => configPreExists || configSaved);

const deps: ConfigureDeps = {
  saveConfig: saveConfigFn,
  configExists: configExistsFn,
  getConfigPath: getConfigPathFn,
};

beforeEach(() => {
  saveConfigFn.mockClear();
  configExistsFn.mockClear();
  getConfigPathFn.mockClear();
  configPreExists = false;
  configSaved = false;
});

suppressAnsiColor();

describe("auth configure", () => {
  test("saves config, reports success, and masks the token", async () => {
    const { context, stdout } = createMockContext();
    await configure.call(
      context,
      {
        customerId: "123456789012",
        token: "sekret-token-value",
        domain: "observeinc.com",
      },
      deps,
    );

    expect(saveConfigFn).toHaveBeenCalledTimes(1);
    const [savedArg] = saveConfigFn.mock.calls[0]!;
    expect(savedArg).toMatchObject({
      customerId: "123456789012",
      token: "sekret-token-value",
      domain: "observeinc.com",
    });

    const out = stdout.join("");
    expect(out).toContain("saved successfully");
    // Token is masked; the full secret is never printed.
    expect(out).not.toContain("sekret-token-value");
    expect(out).toContain("Customer ID: 123456789012");
  });

  // Pre-existing config -> "updated" (existence is checked before the save).
  test("reports 'updated' when a config already exists", async () => {
    configPreExists = true;
    const { context, stdout } = createMockContext();
    await configure.call(
      context,
      { customerId: "c1", token: "t1234", domain: "observeinc.com" },
      deps,
    );
    expect(stdout.join("")).toContain("updated successfully");
  });

  test("includes the API URL when provided", async () => {
    const { context, stdout } = createMockContext();
    await configure.call(
      context,
      {
        customerId: "c1",
        token: "t1234",
        domain: "observeinc.com",
        apiUrl: "https://123.observeinc.com/v1/meta",
      },
      deps,
    );
    expect(stdout.join("")).toContain(
      "API URL: https://123.observeinc.com/v1/meta",
    );
  });

  test("exits with code 1 when saving fails", async () => {
    saveConfigFn.mockImplementationOnce(() => {
      throw new Error("disk full");
    });
    const { context, stderr, getExitCode } = createMockContext();
    try {
      await configure.call(
        context,
        { customerId: "c1", token: "t1234", domain: "observeinc.com" },
        deps,
      );
      throw new Error("expected process.exit");
    } catch (error) {
      expect((error as Error).message).toBe("process.exit");
    }
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Failed to save configuration");
    expect(stderr.join("")).toContain("disk full");
  });
});
