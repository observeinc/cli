import { describe, expect, test } from "bun:test";
import { concretizeWindow, intervalToMs, resolveWindow } from "./time-window";

describe("intervalToMs", () => {
  test("parses durations", () => {
    expect(intervalToMs("1h")).toBe(3_600_000);
    expect(intervalToMs("30s")).toBe(30_000);
    expect(intervalToMs("7d")).toBe(604_800_000);
    expect(intervalToMs("500ms")).toBe(500);
  });
  test("rejects malformed durations", () => {
    expect(() => intervalToMs("abc")).toThrow("Invalid interval");
    expect(() => intervalToMs("5x")).toThrow("Invalid interval");
    expect(() => intervalToMs("h")).toThrow("Invalid interval");
  });
});

describe("resolveWindow", () => {
  test("--interval anchors a concrete window ending now", () => {
    const { startTime, endTime } = resolveWindow({ interval: "4h" });
    expect(typeof startTime).toBe("string");
    expect(typeof endTime).toBe("string");
    const span = (Date.parse(endTime!) - Date.parse(startTime!)) / 3_600_000;
    expect(span).toBeCloseTo(4, 1);
  });

  test("absolute bounds are validated + normalized to ISO", () => {
    expect(
      resolveWindow({
        start: "2026-07-01T00:00:00Z",
        end: "2026-07-01T06:00:00Z",
      }),
    ).toEqual({
      startTime: "2026-07-01T00:00:00.000Z",
      endTime: "2026-07-01T06:00:00.000Z",
    });
  });

  test("a lone --start or --end is preserved (open interval)", () => {
    expect(resolveWindow({ start: "2026-07-01T00:00:00Z" })).toEqual({
      startTime: "2026-07-01T00:00:00.000Z",
      endTime: undefined,
    });
    expect(resolveWindow({ end: "2026-07-01T06:00:00Z" })).toEqual({
      startTime: undefined,
      endTime: "2026-07-01T06:00:00.000Z",
    });
  });

  test("neither given → empty (backend fills)", () => {
    expect(resolveWindow({})).toEqual({
      startTime: undefined,
      endTime: undefined,
    });
  });

  test("--interval combined with --start/--end is rejected", () => {
    expect(() =>
      resolveWindow({ interval: "1h", start: "2026-07-01T00:00:00Z" }),
    ).toThrow("Use either --interval or --start/--end");
    expect(() =>
      resolveWindow({ interval: "1h", end: "2026-07-01T00:00:00Z" }),
    ).toThrow("Use either --interval or --start/--end");
  });

  test("an unparseable bound is rejected", () => {
    expect(() => resolveWindow({ start: "garbage" })).toThrow("--start");
    expect(() => resolveWindow({ end: "nope" })).toThrow("--end");
  });
});

describe("concretizeWindow", () => {
  test("fills both bounds when neither is set", () => {
    const { startTime, endTime } = concretizeWindow({}, "1h");
    const span = (Date.parse(endTime) - Date.parse(startTime)) / 3_600_000;
    expect(span).toBeCloseTo(1, 1);
  });

  test("a lone start fills end=now", () => {
    const { startTime, endTime } = concretizeWindow(
      { startTime: "2026-07-01T00:00:00.000Z" },
      "1h",
    );
    expect(startTime).toBe("2026-07-01T00:00:00.000Z");
    expect(Date.parse(endTime)).toBeGreaterThan(Date.parse(startTime));
  });

  test("a lone end fills start=end-defaultInterval", () => {
    expect(
      concretizeWindow({ endTime: "2026-07-01T06:00:00.000Z" }, "1h"),
    ).toEqual({
      startTime: "2026-07-01T05:00:00.000Z",
      endTime: "2026-07-01T06:00:00.000Z",
    });
  });

  test("passes both bounds through unchanged", () => {
    expect(
      concretizeWindow(
        {
          startTime: "2026-07-01T00:00:00.000Z",
          endTime: "2026-07-01T06:00:00.000Z",
        },
        "1h",
      ),
    ).toEqual({
      startTime: "2026-07-01T00:00:00.000Z",
      endTime: "2026-07-01T06:00:00.000Z",
    });
  });
});
