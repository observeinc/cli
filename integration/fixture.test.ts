import { $ } from "bun";
import { describe, expect, test } from "bun:test";
import { InvalidCliCommandError, IntegrationFixture } from "./fixture";

const tenant = {
  customerId: "123456789",
  domain: "observeinc.com",
  token: "test-token",
};

describe("runCli command validation", () => {
  test("rejects missing observe prefix", async () => {
    const fixture = new IntegrationFixture(tenant);
    try {
      try {
        await fixture.runCli`auth status --json`;
        throw new Error("expected runCli to throw");
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidCliCommandError);
      }
    } finally {
      await fixture.cleanup();
    }
  });

  test("rejects observe without subcommand", async () => {
    const fixture = new IntegrationFixture(tenant);
    try {
      try {
        await fixture.runCli`observe`;
        throw new Error("expected runCli to throw");
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidCliCommandError);
      }
    } finally {
      await fixture.cleanup();
    }
  });

  test("rejects empty command", async () => {
    const fixture = new IntegrationFixture(tenant);
    try {
      try {
        await fixture.runCli`${""}`;
        throw new Error("expected runCli to throw");
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidCliCommandError);
      }
    } finally {
      await fixture.cleanup();
    }
  });

  test("Bun shell parses backslash line continuations end-to-end", async () => {
    const argsPart = `one \\
  two three`;

    const result = await $`printf "%s\\n" ${{ raw: argsPart }}`
      .nothrow()
      .quiet();

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString().trim().split("\n")).toEqual([
      "one",
      "two",
      "three",
    ]);
  });
});
