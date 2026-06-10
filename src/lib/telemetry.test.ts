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
