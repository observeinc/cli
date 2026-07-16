import { describe, expect, test } from "bun:test";
import type { RouteMap } from "@stricli/core";
import type { LocalContext } from "../context";
import { defineCommand, defineRoutes } from "./stricli-wrappers";
import { EXPERIMENTAL_ENV_VAR, isExperimental } from "./experimental";

// --- helpers ---------------------------------------------------------------

/** Run `fn` with the experimental flag set to `value` (undefined = unset). */
function withFlag<T>(value: string | undefined, fn: () => T): T {
  const prev = process.env[EXPERIMENTAL_ENV_VAR];
  if (value === undefined)
    Reflect.deleteProperty(process.env, EXPERIMENTAL_ENV_VAR);
  else process.env[EXPERIMENTAL_ENV_VAR] = value;
  try {
    return fn();
  } finally {
    if (prev === undefined)
      Reflect.deleteProperty(process.env, EXPERIMENTAL_ENV_VAR);
    else process.env[EXPERIMENTAL_ENV_VAR] = prev;
  }
}

function fakeContext() {
  const errors: string[] = [];
  const noop = () => {
    return;
  };
  const process = { exitCode: undefined as number | undefined };
  const ctx = {
    writer: {
      write: noop,
      info: noop,
      success: noop,
      warn: noop,
      error: (msg: string) => errors.push(msg),
    },
    process,
  } as unknown as LocalContext;
  return { ctx, errors, process };
}

/** A dummy leaf command that records when its action runs. */
function dummyCommand(
  opts: { experimental?: boolean; onRun?: () => void } = {},
) {
  function run(this: LocalContext): void {
    opts.onRun?.();
  }
  return defineCommand({
    experimental: opts.experimental,
    loader: async () => run,
    parameters: { positional: { kind: "tuple", parameters: [] }, flags: {} },
    docs: { brief: "Dummy command" },
  });
}

function hiddenByName(map: RouteMap<LocalContext>, name: string): boolean {
  const entry = map.getAllEntries().find((e) => e.name.original === name);
  if (!entry) throw new Error(`no route named ${name}`);
  return entry.hidden;
}

// --- experimental commands -------------------------------------------------

describe("experimental commands", () => {
  test("a plain command is not experimental and is not badged", () => {
    const cmd = dummyCommand();
    expect(isExperimental(cmd)).toBe(false);
    expect(cmd.brief).toBe("Dummy command");
  });

  test("an experimental command is registered and badged", () => {
    const cmd = dummyCommand({ experimental: true });
    expect(isExperimental(cmd)).toBe(true);
    expect(cmd.brief).toContain("[experimental]");
  });

  test("the gate blocks when the flag is off and runs when it is on", async () => {
    let ran = false;
    const cmd = dummyCommand({ experimental: true, onRun: () => (ran = true) });
    const action = await cmd.loader();
    if (typeof action !== "function") throw new Error("expected a function");

    const off = fakeContext();
    withFlag(undefined, () => void action.call(off.ctx, {}));
    expect(ran).toBe(false);
    expect(off.process.exitCode).toBe(1);
    expect(off.errors[0]).toContain(EXPERIMENTAL_ENV_VAR);

    const on = fakeContext();
    withFlag("1", () => void action.call(on.ctx, {}));
    expect(ran).toBe(true);
    expect(on.process.exitCode).toBeUndefined();
  });
});

// --- experimental route groups ---------------------------------------------

describe("experimental route groups", () => {
  test("a mixed group stays GA; only its experimental child is hidden (off)", () => {
    const group = withFlag(undefined, () =>
      defineRoutes({
        routes: {
          ga: dummyCommand(),
          exp: dummyCommand({ experimental: true }),
        },
        docs: { brief: "Mixed group" },
      }),
    );

    expect(isExperimental(group)).toBe(false);
    expect(group.brief).toBe("Mixed group");
    expect(hiddenByName(group, "ga")).toBe(false);
    expect(hiddenByName(group, "exp")).toBe(true);
  });

  test("a mixed group's experimental child is visible when the flag is on", () => {
    const group = withFlag("1", () =>
      defineRoutes({
        routes: {
          ga: dummyCommand(),
          exp: dummyCommand({ experimental: true }),
        },
        docs: { brief: "Mixed group" },
      }),
    );
    expect(hiddenByName(group, "exp")).toBe(false);
  });

  test("a group whose every child is experimental becomes experimental + badged", () => {
    const group = withFlag(undefined, () =>
      defineRoutes({
        routes: {
          a: dummyCommand({ experimental: true }),
          b: dummyCommand({ experimental: true }),
        },
        docs: { brief: "All experimental" },
      }),
    );
    expect(isExperimental(group)).toBe(true);
    expect(group.brief).toContain("[experimental]");
  });

  test("experimental-ness bubbles up through nested groups", () => {
    const leaf = defineRoutes({
      routes: {
        a: dummyCommand({ experimental: true }),
        b: dummyCommand({ experimental: true }),
      },
      docs: { brief: "Leaf group" },
    });
    expect(isExperimental(leaf)).toBe(true);

    // A parent whose only child is the (experimental) leaf group is itself
    // experimental; a parent that also has a GA child is not.
    const allExpParent = defineRoutes({
      routes: { leaf },
      docs: { brief: "Parent of leaf" },
    });
    expect(isExperimental(allExpParent)).toBe(true);

    const mixedParent = withFlag(undefined, () =>
      defineRoutes({
        routes: { leaf, ga: dummyCommand() },
        docs: { brief: "Mixed parent" },
      }),
    );
    expect(isExperimental(mixedParent)).toBe(false);
    expect(hiddenByName(mixedParent, "leaf")).toBe(true);
    expect(hiddenByName(mixedParent, "ga")).toBe(false);
  });
});
