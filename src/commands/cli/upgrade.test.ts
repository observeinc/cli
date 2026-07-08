import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../test-helpers";
import { CURRENT_CLI_VERSION } from "../../lib/constants";
import { upgrade, type UpgradeDeps } from "./upgrade";

// Only the version-check / "already up to date" short-circuit is unit-tested
// here: it's the handler's own decision logic and runs before any filesystem
// access. The download + atomic binary swap that follows is filesystem- and
// network-heavy and is left to integration tests rather than mocking node:fs.
let latestToReturn: { version: string; tag: string; url: string };
const fetchLatestReleaseFn = mock(() => Promise.resolve(latestToReturn));
const loadStateFn = mock(() => ({ installPath: "/usr/local/bin/observe" }));

const deps: UpgradeDeps = {
  loadState: loadStateFn,
  fetchLatestRelease: fetchLatestReleaseFn,
};

beforeEach(() => {
  fetchLatestReleaseFn.mockClear();
  loadStateFn.mockClear();
  latestToReturn = {
    version: CURRENT_CLI_VERSION,
    tag: `v${CURRENT_CLI_VERSION}`,
    url: "https://example.com/release",
  };
});

suppressAnsiColor();

describe("cli upgrade", () => {
  test("checks for updates and reports already up to date", async () => {
    const { context, stdout } = createMockContext();
    await upgrade.call(context, {}, deps);

    expect(fetchLatestReleaseFn).toHaveBeenCalledTimes(1);
    const out = stdout.join("");
    expect(out).toContain("Checking for updates...");
    expect(out).toContain(`Already up to date (v${CURRENT_CLI_VERSION})`);
  });
});
