import { z } from "zod";
import { ECOSYSTEMS } from "./version-grammar";

/**
 * Schema for the bundled OpenTelemetry support manifest. The manifest is a
 * hand-maintained data file read at runtime by the static compatibility check.
 * It maps each runtime OpenTelemetry tracks to its auto-instrumentation facts,
 * per-signal SDK stability, and a per-package compatibility matrix for external
 * and library-native instrumentation.
 */

/**
 * Per-signal SDK maturity, mirroring `opentelemetry.io/data/instrumentation.yaml`
 * (`-` in the source is normalized to `none`).
 */
export const SDK_STABILITY_LEVELS = [
  "stable",
  "release_candidate",
  "beta",
  "development",
  "none",
] as const;
export type SdkStabilityLevel = (typeof SDK_STABILITY_LEVELS)[number];

const sdkStabilitySchema = z
  .object({
    traces: z.enum(SDK_STABILITY_LEVELS),
    metrics: z.enum(SDK_STABILITY_LEVELS),
    logs: z.enum(SDK_STABILITY_LEVELS),
    profiles: z.enum(SDK_STABILITY_LEVELS),
  })
  .strict();
export type SdkStability = z.infer<typeof sdkStabilitySchema>;

const ecosystemSchema = z.enum(ECOSYSTEMS);

export const instrumentationOptionSchema = z
  .object({
    id: z.string().trim().min(1),
    instrumentation: z.string().trim().min(1),
    kind: z.enum(["native", "external"]),
    supportedVersions: z.string().trim().min(1).optional(),
    inAutoInstrumentation: z.boolean().optional(),
    /**
     * How telemetry starts flowing once the instrumentation is present:
     * `automatic` (zero-code / auto-instrumentation, no user action),
     * `opt-in` (off by default; a config flag or environment variable turns
     * it on), or `manual` (the application must wire it into its own code,
     * e.g. wrapping a handler or registering an interceptor; nothing injects
     * it).
     */
    activation: z.enum(["automatic", "opt-in", "manual"]),
  })
  .strict();
export type InstrumentationOption = z.infer<typeof instrumentationOptionSchema>;

/** One instrumented library (Tier 1 only). */
const packageEntrySchema = z
  .object({
    /** The instrumented library, named in its own ecosystem. */
    name: z.string().min(1),
    /**
     * Other distribution names for the same importable library that the
     * instrumentation also accepts (e.g. `psycopg2-binary` for `psycopg2`).
     */
    aliases: z.array(z.string().min(1)).min(1).optional(),
    /** Supported version range in semver comparator syntax; absent when unknown. */
    supportedVersions: z.string().min(1).optional(),
    /** Whether the library is covered by the zero-code / meta-package bundle. */
    inAutoInstrumentation: z.boolean().optional(),
    /** The OpenTelemetry package that instruments the library. */
    instrumentation: z.string().min(1).optional(),
    instrumentationOptions: z
      .array(instrumentationOptionSchema)
      .min(1)
      .optional(),
  })
  .strict()
  .superRefine((entry, context) => {
    if (entry.instrumentationOptions == null) return;
    for (const field of [
      "supportedVersions",
      "instrumentation",
      "inAutoInstrumentation",
    ] as const)
      if (entry[field] !== undefined)
        context.addIssue({
          code: "custom",
          path: [field],
          message:
            "Cannot mix scalar instrumentation fields with instrumentationOptions",
        });
    const ids = entry.instrumentationOptions.map((option) => option.id);
    if (new Set(ids).size !== ids.length)
      context.addIssue({
        code: "custom",
        path: ["instrumentationOptions"],
        message: "Duplicate instrumentation option ID",
      });
  });
export type PackageEntry = z.infer<typeof packageEntrySchema>;

const runtimeEntrySchema = z
  .object({
    ecosystem: ecosystemSchema,
    /** Runtime versions auto-instrumentation supports (semver syntax). */
    supportedRuntimeVersions: z.string().min(1).optional(),
    /** True when a manifest-detectable auto-instrumentation path exists. */
    autoInstrumentationSupported: z.boolean(),
    /** True when OpenTelemetry provides runtime/host metrics for this runtime. */
    runtimeMetricsSupported: z.boolean(),
    sdkStability: sdkStabilitySchema,
    /** Instrumented libraries, independent of runtime-wide auto-instrumentation. */
    packages: z.array(packageEntrySchema),
  })
  .strict();
export type RuntimeEntry = z.infer<typeof runtimeEntrySchema>;

export const otelSupportManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    generatedAt: z.string().min(1),
    /** Keyed by the `telemetry.sdk.language` value (e.g. `nodejs`, `dotnet`). */
    runtimes: z.record(z.string(), runtimeEntrySchema),
  })
  .strict();
export type OtelSupportManifest = z.infer<typeof otelSupportManifestSchema>;

/**
 * Validate an untrusted value (e.g. an imported YAML document) against the
 * manifest schema, throwing a descriptive error when it does not conform.
 */
export function parseManifest(value: unknown): OtelSupportManifest {
  return otelSupportManifestSchema.parse(value);
}
