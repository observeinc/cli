import { describe, expect, mock, test } from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../test-helpers";
import { FEATURE_NOT_ENABLED_MESSAGE } from "../../lib/format-error";
import type { getSetupInfo } from "../../rest/share-in/get-setup-info";
import { setup } from "./setup";
import { apiError, loadConfigStub, setupInfoStub } from "./test-fixtures";

suppressAnsiColor();

const getFn = mock<typeof getSetupInfo>(() => Promise.resolve(setupInfoStub()));
const deps = { loadConfig: loadConfigStub, getSetupInfo: getFn };

describe("share-in setup", () => {
  test("prints the server's setup SQL, checks and checklist", async () => {
    const { context, stdout } = createMockContext();
    await setup.call(context, {}, deps);
    const out = stdout.join("");
    expect(out).toContain("OBSERVE.CONSUMER");
    expect(out).toContain("CREATE SHARE <your_share_name>;");
    expect(out).toContain("SHOW GRANTS TO SHARE <your_share_name>;");
    expect(out).toContain("<ORG>.<ACCOUNT>");
  });

  test("--share-name fills the placeholder", async () => {
    const { context, stdout } = createMockContext();
    await setup.call(context, { shareName: "OBSERVE_SHARE" }, deps);
    const out = stdout.join("");
    expect(out).toContain(
      "ALTER SHARE OBSERVE_SHARE ADD ACCOUNTS = OBSERVE.CONSUMER;",
    );
    expect(out).not.toContain("<your_share_name>");
  });

  test("shell-quotes a quoted share name in the token create hint", async () => {
    const { context, stdout } = createMockContext();
    await setup.call(context, { shareName: '"My Share"' }, deps);
    const out = stdout.join("");
    expect(out).toContain('ALTER SHARE "My Share" ADD ACCOUNTS');
    expect(out).toContain(`token create --share-name '"My Share"'`);
  });

  test("--json prints the response unchanged", async () => {
    const { context, stdout } = createMockContext();
    await setup.call(context, { json: true }, deps);
    expect(JSON.parse(stdout.join(""))).toEqual(setupInfoStub());
  });

  test("shows the friendly message when the API is not enabled", async () => {
    getFn.mockImplementationOnce(() =>
      Promise.reject(apiError(403, "feature_not_enabled", "not enabled")),
    );
    const { context, stderr, getExitCode } = createMockContext();
    await setup.call(context, {}, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain(FEATURE_NOT_ENABLED_MESSAGE);
  });
});
