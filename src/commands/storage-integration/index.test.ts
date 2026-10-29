import { afterEach, describe, expect, test } from "bun:test";
import { createMockContext } from "../../test-helpers";
import { EXPERIMENTAL_ENV_VAR, isExperimental } from "../../lib/experimental";
import { storageIntegrationRoutes } from "./index";
import { listCommand } from "./list";

describe("storage-integration routes", () => {
  const previous = process.env[EXPERIMENTAL_ENV_VAR];
  afterEach(() => {
    if (previous === undefined)
      Reflect.deleteProperty(process.env, EXPERIMENTAL_ENV_VAR);
    else process.env[EXPERIMENTAL_ENV_VAR] = previous;
  });

  test("the whole group is experimental", () => {
    expect(isExperimental(storageIntegrationRoutes)).toBe(true);
  });

  test("the loaded command refuses to run without the env var", async () => {
    Reflect.deleteProperty(process.env, EXPERIMENTAL_ENV_VAR);
    const action = await listCommand.loader();
    if (typeof action !== "function") throw new Error("expected a function");
    const { context, stderr, getExitCode } = createMockContext();
    await action.call(context, { limit: 100 });
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain(EXPERIMENTAL_ENV_VAR);
  });
});
