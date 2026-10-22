import { describe, expect, mock, test } from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../../test-helpers";
import type { createRegistrationToken } from "../../../rest/share-in/create-registration-token";
import { create } from "./create";
import { loadConfigStub, tokenStub } from "../test-fixtures";

suppressAnsiColor();

const createFn = mock<typeof createRegistrationToken>(() =>
  Promise.resolve(tokenStub("tok-123")),
);
const deps = { loadConfig: loadConfigStub, createRegistrationToken: createFn };
const flags = { shareName: "OBSERVE_SHARE", providerAccount: "ACME.PROD" };

describe("share-in token create", () => {
  test("sends only the provider account", async () => {
    const { context } = createMockContext();
    await create.call(context, flags, deps);
    expect(createFn.mock.calls[0]![0]).toMatchObject({
      providerAccount: "ACME.PROD",
    });
  });

  test("prints the server's statement with the share name filled in", async () => {
    const { context, stdout } = createMockContext();
    await create.call(context, flags, deps);
    const out = stdout.join("");
    expect(out).toContain("ALTER SHARE OBSERVE_SHARE SET COMMENT = 'tok-123';");
    expect(out).toContain(
      "observe share-in register --share-name OBSERVE_SHARE --provider-account ACME.PROD",
    );
  });

  test("shell-quotes the register command but not the SQL", async () => {
    const { context, stdout } = createMockContext();
    await create.call(
      context,
      { shareName: '"Sales $hare"', providerAccount: "ACME.PROD" },
      deps,
    );
    const out = stdout.join("");
    expect(out).toContain(`ALTER SHARE "Sales $hare" SET COMMENT`);
    expect(out).toContain(
      `register --share-name '"Sales $hare"' --provider-account ACME.PROD`,
    );
  });

  test("--json keeps the response shape", async () => {
    const { context, stdout } = createMockContext();
    await create.call(context, { ...flags, json: true }, deps);
    const payload = JSON.parse(stdout.join("")) as {
      token: string;
      setupSql: { sql: string }[];
    };
    expect(payload.token).toBe("tok-123");
    expect(payload.setupSql[0]!.sql).toContain("ALTER SHARE OBSERVE_SHARE");
  });
});
