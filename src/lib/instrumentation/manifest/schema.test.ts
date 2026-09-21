import { expect, test } from "bun:test";
import { parseManifest } from "./schema";

const option = {
  id: "native",
  instrumentation: "example",
  kind: "native",
  supportedVersions: ">=2.0.0",
  activation: "opt-in",
};

function proposedManifest() {
  return {
    schemaVersion: 1 as const,
    generatedAt: "2026-01-01T00:00:00Z",
    runtimes: {
      ruby: {
        ecosystem: "gems" as const,
        autoInstrumentationSupported: true,
        runtimeMetricsSupported: false,
        sdkStability: {
          traces: "stable",
          metrics: "development",
          logs: "development",
          profiles: "none",
        },
        packages: [
          {
            name: "example",
            instrumentationOptions: [structuredClone(option)],
          },
        ],
      },
    },
  };
}

test("manifest v1 remains unchanged on parse", () => {
  const manifest = proposedManifest();
  expect(parseManifest(manifest) as unknown).toEqual(manifest);
});

test("a package accepts native and external options in v1", () => {
  const manifest = proposedManifest();
  manifest.runtimes.ruby.packages[0]!.instrumentationOptions.push({
    ...option,
    id: "community",
    kind: "external",
  });
  expect(parseManifest(manifest) as unknown).toEqual(manifest);
});

test.each([
  "mixed",
  "empty",
  "duplicate",
  "unknown-key",
  "activation",
  "activation-unknown",
])("rejects invalid option contract: %s", (mode) => {
  const manifest = proposedManifest();
  const entry = manifest.runtimes.ruby.packages[0]!;
  if (mode === "mixed") Object.assign(entry, { supportedVersions: "*" });
  if (mode === "empty") entry.instrumentationOptions = [];
  if (mode === "duplicate") entry.instrumentationOptions.push({ ...option });
  if (mode === "unknown-key")
    Object.assign(entry.instrumentationOptions[0]!, { enabled: true });
  if (mode === "activation")
    entry.instrumentationOptions[0]!.activation = "enabled";
  if (mode === "activation-unknown")
    entry.instrumentationOptions[0]!.activation = "unknown";
  expect(() => parseManifest(manifest)).toThrow();
});
