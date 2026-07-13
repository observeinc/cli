import { describe, expect, test } from "bun:test";
import { createMockContext } from "../../test-helpers";
import { logUseCommand } from "./log-use";

describe("skill log-use handler", () => {
  // With telemetry disabled there is no active span, so setSkillName must no-op
  // rather than throw. This is the load-bearing part of the best-effort contract
  // — the command must never disrupt the agent that invoked it — and it's the
  // default path for anyone running a dev build.
  test("prints the confirmation and never errors or exits when no span is active", async () => {
    const action = await logUseCommand.loader();
    if (typeof action !== "function") throw new Error("expected a function");
    const { context, stdout, stderr, getExitCode } = createMockContext();

    await action.call(context, {}, "alert-investigation");

    expect(stdout.join("")).toContain(
      'Recorded use of skill "alert-investigation".',
    );
    expect(stderr).toEqual([]);
    expect(getExitCode()).toBeUndefined();
  });
});
