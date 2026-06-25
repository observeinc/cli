import { describe, expect, test } from "bun:test";
import type { LocalContext } from "../context";
import {
  EXPERIMENTAL_ENV_VAR,
  isExperimentalEnabled,
  withExperimentalBadge,
  hideExperimentalRoutes,
  gateExperimental,
} from "./experimental";

describe("isExperimentalEnabled", () => {
  test.each([
    ["1", true],
    ["true", true],
    ["TRUE", true],
    ["  true  ", true],
    ["0", false],
    ["false", false],
    ["yes", false],
    ["", false],
    [undefined, false],
  ])("%p -> %p", (value, expected) => {
    const env = value === undefined ? {} : { [EXPERIMENTAL_ENV_VAR]: value };
    expect(isExperimentalEnabled(env)).toBe(expected);
  });
});

describe("withExperimentalBadge", () => {
  test("prefixes the badge and keeps the original brief", () => {
    const result = withExperimentalBadge("List widgets");
    expect(result).toContain("[experimental]");
    expect(result).toContain("List widgets");
  });
});

describe("hideExperimentalRoutes", () => {
  test("hides routes when the flag is off", () => {
    expect(hideExperimentalRoutes(["a", "b"], {})).toEqual({
      a: true,
      b: true,
    });
  });

  test("reveals routes when the flag is on", () => {
    expect(
      hideExperimentalRoutes(["a", "b"], { [EXPERIMENTAL_ENV_VAR]: "1" }),
    ).toEqual({ a: false, b: false });
  });
});

describe("gateExperimental", () => {
  function fakeContext() {
    const errors: string[] = [];
    const exits: number[] = [];
    const noop = () => {
      return;
    };
    const ctx = {
      writer: {
        write: noop,
        info: noop,
        success: noop,
        warn: noop,
        error: (msg: string) => errors.push(msg),
      },
      process: {
        exit: (code?: number) => {
          exits.push(code ?? 0);
        },
      },
    } as unknown as LocalContext;
    return { ctx, errors, exits };
  }

  test("blocks execution and exits when the flag is off", async () => {
    const { ctx, errors, exits } = fakeContext();
    let ran = false;
    const guarded = gateExperimental(async () => {
      ran = true;
    }, {});

    await guarded.call(ctx);

    expect(ran).toBe(false);
    expect(exits).toEqual([1]);
    expect(errors[0]).toContain(EXPERIMENTAL_ENV_VAR);
  });

  test("runs the handler and forwards args when the flag is on", async () => {
    const { ctx, exits } = fakeContext();
    const seen: unknown[] = [];
    const guarded = gateExperimental(
      async function (this: LocalContext, a: string, b: number) {
        seen.push(a, b);
        expect(this).toBe(ctx);
      },
      { [EXPERIMENTAL_ENV_VAR]: "1" },
    );

    await guarded.call(ctx, "x", 7);

    expect(seen).toEqual(["x", 7]);
    expect(exits).toEqual([]);
  });
});
