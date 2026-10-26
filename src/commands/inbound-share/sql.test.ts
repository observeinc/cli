import { describe, expect, test } from "bun:test";
import { withShareName } from "./sql";

const steps = [
  {
    description: "Check",
    sql: "SHOW SHARES LIKE '<your_share_name>';\nALTER SHARE <your_share_name> ADD ACCOUNTS = X;",
  },
];

describe("withShareName", () => {
  test("puts a plain name in both places", () => {
    expect(withShareName(steps, "OBSERVE_SHARE")[0]!.sql).toBe(
      "SHOW SHARES LIKE 'OBSERVE_SHARE';\nALTER SHARE OBSERVE_SHARE ADD ACCOUNTS = X;",
    );
  });

  test("a string literal gets the name without double quotes and with ' doubled", () => {
    expect(withShareName(steps, `"My 'Share'"`)[0]!.sql).toBe(
      `SHOW SHARES LIKE 'My ''Share''';\nALTER SHARE "My 'Share'" ADD ACCOUNTS = X;`,
    );
  });

  test("no name leaves the placeholder", () => {
    expect(withShareName(steps, undefined)).toBe(steps);
  });
});
