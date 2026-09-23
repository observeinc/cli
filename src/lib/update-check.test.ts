import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { getConfigDir } from "./config";
import { CONFIG_FILES } from "./constants";
import { startBackgroundUpdateCheck } from "./update-check";
import { suppressAnsiColor } from "../test-helpers";

suppressAnsiColor();

describe("startBackgroundUpdateCheck", () => {
  const statePath = join(getConfigDir(), CONFIG_FILES.state.name);
  let hadExistingState = false;
  let existingState: string | undefined;

  beforeEach(() => {
    if (existsSync(statePath)) {
      hadExistingState = true;
      existingState = readFileSync(statePath, "utf-8");
    }
    try {
      rmSync(statePath);
    } catch {
      // may not exist
    }
  });

  afterEach(() => {
    try {
      rmSync(statePath);
    } catch {
      // may not exist
    }
    if (hadExistingState && existingState) {
      writeFileSync(statePath, existingState);
    }
  });

  function writeState(state: Record<string, string>) {
    mkdirSync(getConfigDir(), { recursive: true });
    writeFileSync(statePath, JSON.stringify(state));
  }

  test("skips check when OBSERVE_NO_UPDATE_NOTIFIER is set", async () => {
    const result = startBackgroundUpdateCheck({
      OBSERVE_NO_UPDATE_NOTIFIER: "1",
    });

    expect(await result.getResult()).toBeNull();
  });

  test("skips check for dev builds", async () => {
    // CURRENT_CLI_VERSION is "0.0.0-dev" in test environment
    const result = startBackgroundUpdateCheck({});

    expect(await result.getResult()).toBeNull();
  });

  test("returns null when no cached version and check is skipped", async () => {
    writeState({ lastUpdateCheck: new Date().toISOString() });

    const result = startBackgroundUpdateCheck({});

    expect(await result.getResult()).toBeNull();
  });

  test("notifies when a cached latest version is newer than the running CLI", async () => {
    writeState({
      lastUpdateCheck: new Date().toISOString(),
      latestKnownVersion: "1.0.1",
    });

    const result = startBackgroundUpdateCheck({}, { currentVersion: "0.0.8" });
    const message = await result.getResult();

    expect(message).toContain("0.0.8");
    expect(message).toContain("1.0.1");
    expect(message).toContain("observe cli upgrade");
  });

  test("does not notify for cli upgrade even when a newer version is cached", async () => {
    writeState({
      lastUpdateCheck: new Date().toISOString(),
      latestKnownVersion: "1.0.1",
    });

    const result = startBackgroundUpdateCheck(
      {},
      { args: ["cli", "upgrade"], currentVersion: "0.0.8" },
    );

    expect(await result.getResult()).toBeNull();
  });

  test("does not notify if upgrade recorded the new installed version before getResult", async () => {
    writeState({
      lastUpdateCheck: new Date().toISOString(),
      latestKnownVersion: "1.0.1",
      installedVersion: "0.0.8",
    });

    const result = startBackgroundUpdateCheck({}, { currentVersion: "0.0.8" });

    writeState({
      lastUpdateCheck: new Date().toISOString(),
      latestKnownVersion: "1.0.1",
      installedVersion: "1.0.1",
    });

    expect(await result.getResult()).toBeNull();
  });

  test("still notifies when installed version is behind the cached latest", async () => {
    writeState({
      lastUpdateCheck: new Date().toISOString(),
      latestKnownVersion: "1.0.1",
      installedVersion: "0.0.8",
    });

    const result = startBackgroundUpdateCheck({}, { currentVersion: "0.0.8" });
    const message = await result.getResult();

    expect(message).toContain("0.0.8 -> 1.0.1");
  });
});
