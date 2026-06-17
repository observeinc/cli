declare const OBSERVE_CLI_VERSION: string | undefined;
declare const OBSERVE_INGEST_TOKEN: string | undefined;
declare const OBSERVE_COLLECT_URL: string | undefined;

export const BUILD_ENV = {
  VERSION: "VERSION",
  RELEASE_BUILD: "RELEASE_BUILD",
  OBSERVE_INGEST_TOKEN: "OBSERVE_INGEST_TOKEN",
  OBSERVE_COLLECT_URL: "OBSERVE_COLLECT_URL",
  OBSERVE_GQL_SPEC: "OBSERVE_GQL_SPEC",
  OBSERVE_GQL_TOKEN: "OBSERVE_GQL_TOKEN",
  OBSERVE_OPENAPI_SPEC: "OBSERVE_OPENAPI_SPEC",
} as const;

// Env vars whose values are string-substituted into the JS bundle at build
// time via Bun's `define` option. The release-bundle scan in scripts/build.ts
// verifies each of these actually landed in dist/cli.js.
export const TELEMETRY_BUILD_VARS = [
  BUILD_ENV.OBSERVE_INGEST_TOKEN,
  BUILD_ENV.OBSERVE_COLLECT_URL,
] as const;

export const CURRENT_CLI_VERSION =
  typeof OBSERVE_CLI_VERSION !== "undefined"
    ? OBSERVE_CLI_VERSION
    : "0.0.0-dev";

export const CONFIG_DIR_NAME = ".observe";

export const CONFIG_DIR_MODE = 0o700 as const;

export const CONFIG_FILES = {
  config: { name: "config.json", mode: 0o600 },
  state: { name: "state.json", mode: 0o600 },
  bin: { name: "bin", mode: 0o700 },
} as const;

export const GITHUB_REPO = "observeinc/cli";
export const GITHUB_RELEASES_LATEST_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
export const INSTALL_SCRIPT_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/install.sh`;

export const TELEMETRY_TOKEN =
  typeof OBSERVE_INGEST_TOKEN !== "undefined"
    ? OBSERVE_INGEST_TOKEN
    : undefined;

export const COLLECT_URL =
  typeof OBSERVE_COLLECT_URL !== "undefined" ? OBSERVE_COLLECT_URL : undefined;
