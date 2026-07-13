import { describe, expect, test } from "bun:test";

describe("isTelemetryEnabled", () => {
  test("returns false when no token/url are baked in (dev build)", async () => {
    const { isTelemetryEnabled } = await import("./telemetry");
    expect(isTelemetryEnabled()).toBe(false);
  });
});

describe("withTelemetry", () => {
  test("runs callback with undefined span when telemetry is disabled", async () => {
    const { withTelemetry } = await import("./telemetry");
    let receivedSpan: unknown = "not-called";
    await withTelemetry(["dataset", "list"], (span) => {
      receivedSpan = span;
    });
    expect(receivedSpan).toBeUndefined();
  });

  test("propagates callback return value", async () => {
    const { withTelemetry } = await import("./telemetry");
    const result = await withTelemetry(["test"], () => 42);
    expect(result).toBe(42);
  });

  test("propagates errors from callback", async () => {
    const { withTelemetry } = await import("./telemetry");
    expect(() =>
      withTelemetry(["test"], () => {
        throw new Error("test error");
      }),
    ).toThrow("test error");
  });
});

describe("identityAttributes", () => {
  test("includes cli.caller when a caller is set", async () => {
    const { identityAttributes } = await import("./telemetry");
    expect(identityAttributes("claude-code", undefined)).toEqual({
      "cli.caller": "claude-code",
    });
  });

  test("includes cli.caller_session_id when a session id is present", async () => {
    const { identityAttributes } = await import("./telemetry");
    expect(identityAttributes("cursor", "sess-1")).toEqual({
      "cli.caller": "cursor",
      "cli.caller_session_id": "sess-1",
    });
  });

  test("omits all attributes when caller and session id are absent", async () => {
    const { identityAttributes } = await import("./telemetry");
    expect(identityAttributes(undefined, undefined)).toEqual({});
  });

  test("includes only cli.caller when a session id is absent", async () => {
    const { identityAttributes } = await import("./telemetry");
    expect(identityAttributes("codex", undefined)).toEqual({
      "cli.caller": "codex",
    });
  });

  test("includes only the session id when caller is absent", async () => {
    const { identityAttributes } = await import("./telemetry");
    expect(identityAttributes(undefined, "sess-2")).toEqual({
      "cli.caller_session_id": "sess-2",
    });
  });
});

describe("commandNameFromArgv", () => {
  test("joins the resolved command path with dots", async () => {
    const { commandNameFromArgv } = await import("./telemetry");
    expect(commandNameFromArgv(["dataset", "list"])).toBe("dataset.list");
  });

  test("stops at the first flag (the --help case)", async () => {
    const { commandNameFromArgv } = await import("./telemetry");
    expect(commandNameFromArgv(["tag-value", "list", "--help"])).toBe(
      "tag-value.list",
    );
  });

  test("stops before positional values so they never enter the span name", async () => {
    const { commandNameFromArgv } = await import("./telemetry");
    expect(commandNameFromArgv(["dataset", "view", "41007655"])).toBe(
      "dataset.view",
    );
    expect(
      commandNameFromArgv(["dataset", "view", "o:41007655", "--help"]),
    ).toBe("dataset.view");
  });

  test("returns the single leading token for a top-level command", async () => {
    const { commandNameFromArgv } = await import("./telemetry");
    expect(commandNameFromArgv(["query", "--input", "x"])).toBe("query");
  });

  test("falls back to 'cli' when argv is empty or flags-first", async () => {
    const { commandNameFromArgv } = await import("./telemetry");
    expect(commandNameFromArgv([])).toBe("cli");
    expect(commandNameFromArgv(["--help"])).toBe("cli");
  });
});

describe("redactArgv", () => {
  test("redacts --token value (space-separated)", async () => {
    const { redactArgv } = await import("./telemetry");
    expect(
      redactArgv(["auth", "configure", "--token", "sk_live_abc123"]),
    ).toEqual(["auth", "configure", "--token", "<REDACTED>"]);
  });

  test("redacts --token value (equals form)", async () => {
    const { redactArgv } = await import("./telemetry");
    expect(redactArgv(["auth", "configure", "--token=sk_live_abc123"])).toEqual(
      ["auth", "configure", "--token=<REDACTED>"],
    );
  });

  test("leaves sensitive flag at end of argv (no value) unchanged", async () => {
    const { redactArgv } = await import("./telemetry");
    expect(redactArgv(["cmd", "--token"])).toEqual(["cmd", "--token"]);
  });

  test("redacts --gql-token value (space-separated)", async () => {
    const { redactArgv } = await import("./telemetry");
    expect(
      redactArgv([
        "datasource",
        "generate-stack-url",
        "--gql-token",
        "sk_live_abc123",
      ]),
    ).toEqual([
      "datasource",
      "generate-stack-url",
      "--gql-token",
      "<REDACTED>",
    ]);
  });
});
