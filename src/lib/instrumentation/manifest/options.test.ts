import { expect, test } from "bun:test";
import { createCandidate } from "../detectors/common";
import { checkCompatibility } from "./check";
import { fixtureManifest } from "./test-support";
import type { InstrumentationOption } from "./schema";

const community: InstrumentationOption = {
  id: "community",
  instrumentation: "example-adapter",
  kind: "external",
  supportedVersions: ">=1.0.0 <2.0.0",
  inAutoInstrumentation: true,
  activation: "automatic",
};
const native: InstrumentationOption = {
  id: "native",
  instrumentation: "example",
  kind: "native",
  supportedVersions: ">=2.0.0 <3.0.0",
  inAutoInstrumentation: false,
  activation: "opt-in",
};

function assess({
  version,
  options = [community, native],
  auto = true,
}: {
  version: string;
  options?: InstrumentationOption[];
  auto?: boolean;
}) {
  const manifest = fixtureManifest();
  const runtime = manifest.runtimes.ruby!;
  runtime.autoInstrumentationSupported = auto;
  runtime.packages = [{ name: "dalli", instrumentationOptions: options }];
  const candidate = createCandidate({
    directory: ".",
    name: "example",
    language: "ruby",
    runtime: "ruby",
    version: "3.3.0",
    dependencies: [{ name: "dalli", version }],
  });
  return checkCompatibility({ candidate, manifest }).packages;
}

test("union of options covers a declared range spanning the native handoff", () => {
  const result = assess({ version: ">=1.0.0 <3.0.0" });
  expect(result.supported[0]?.versionMatch).toBe("in-range");
  expect(
    result.supported[0]?.instrumentationOptions?.map(
      (option) => option.versionMatch,
    ),
  ).toEqual(["overlap", "overlap"]);
});

test.each(["automatic", "opt-in"] as const)(
  "activation %s is surfaced without changing compatibility or claiming enablement",
  (activation) => {
    const result = assess({
      version: "2.5.0",
      options: [{ ...native, activation }],
    });
    expect(result.supported[0]?.versionMatch).toBe("in-range");
    expect(result.supported[0]?.activation).toBe(activation);
    expect(result.supported[0]?.instrumentationOptions?.[0]?.activation).toBe(
      activation,
    );
  },
);

test("an automatic covering option wins over an opt-in sibling", () => {
  const options = [
    { ...native, id: "auto", activation: "automatic" as const },
    { ...native, id: "manual", activation: "opt-in" as const },
  ];
  expect(assess({ version: "2.5.0", options }).supported[0]?.activation).toBe(
    "automatic",
  );
});

test("opt-in covering options yield opt-in activation", () => {
  const options = [
    { ...native, id: "a", activation: "opt-in" as const },
    {
      ...native,
      id: "b",
      activation: "opt-in" as const,
      supportedVersions: ">=2.0.0 <2.9.0",
    },
  ];
  expect(assess({ version: "2.5.0", options }).supported[0]?.activation).toBe(
    "opt-in",
  );
});

test("cataloged native packages are assessed on SDK-only runtimes and other categories", () => {
  expect(assess({ version: "2.5.0", auto: false }).supported[0]?.name).toBe(
    "dalli",
  );
});

test.each(["1.5.0", "2.5.0"])(
  "one covering alternative proves support for %s",
  (version) => {
    expect(assess({ version }).supported[0]?.versionMatch).toBe("in-range");
  },
);

test("a real interval gap is not filled by merging options", () => {
  const options = [
    community,
    { ...native, supportedVersions: ">=2.1.0 <3.0.0" },
  ];
  expect(
    assess({ version: "2.0.5", options }).unsupported[0]?.versionMatch,
  ).toBe("out-of-range");
  expect(
    assess({ version: ">=1.0.0 <3.0.0", options }).supported[0]?.versionMatch,
  ).toBe("overlap");
});

test("an unknown sibling prevents false incompatibility but not proven support", () => {
  const options = [community, { ...native, supportedVersions: undefined }];
  expect(assess({ version: "1.5.0", options }).supported).toHaveLength(1);
  expect(
    assess({ version: "2.5.0", options }).unverified[0]?.unverifiedReason,
  ).toBe("support-range-missing");
  expect(
    assess({ version: ">=1.0.0 <3.0.0", options }).unsupported,
  ).toHaveLength(0);
  expect(
    assess({ version: ">=1.0.0 <3.0.0", options }).unverified,
  ).toHaveLength(1);
});

test("malformed application versions remain unknown", () => {
  expect(assess({ version: "next" }).unverified[0]?.unverifiedReason).toBe(
    "application-version-unknown",
  );
});

test("explicit wildcard differs from missing option support", () => {
  expect(
    assess({
      version: "8.0.0",
      options: [{ ...native, supportedVersions: "*" }],
    }).supported,
  ).toHaveLength(1);
  expect(
    assess({
      version: "8.0.0",
      options: [{ ...native, supportedVersions: undefined }],
    }).unverified,
  ).toHaveLength(1);
});

test("overlapping alternatives remain distinct", () => {
  const options = [community, { ...native, supportedVersions: ">=1.5.0" }];
  expect(
    assess({
      version: "1.8.0",
      options,
    }).supported[0]?.instrumentationOptions?.map((option) => option.id),
  ).toEqual(["community", "native"]);
});

test.each([
  [">=1 <3", ">=1 <2 || >2.0.0 <3", "overlap"],
  [">=1 <3", ">=1 <2 || =2.0.0 || >2.0.0 <3", "in-range"],
  [">=1 <4", ">=1 <=2 || >=2 <4", "in-range"],
  [">=1 <2 || >=3 <4", ">=1 <1.5 || >=1.5 <2 || >=3 <4", "in-range"],
  [">=1.0.0-alpha <3", ">=1 <2 || >=2 <3", "overlap"],
  [">=1 <3", ">=1 <2 || >=2.0.0-beta <3", "in-range"],
] as const)(
  "preserves union bounds: %s against %s",
  (version, range, expected) => {
    const options = range.split(" || ").map((supportedVersions, index) => ({
      ...native,
      id: String(index),
      supportedVersions,
    }));
    expect(assess({ version, options }).supported[0]?.versionMatch).toBe(
      expected,
    );
  },
);

test("a manual option with no published range reports manual activation", () => {
  const manual: InstrumentationOption = {
    id: "contrib",
    instrumentation: "example-contrib",
    kind: "external",
    inAutoInstrumentation: false,
    activation: "manual",
  };
  const result = assess({ version: "1.5.0", options: [manual], auto: false });
  expect(result.unverified[0]).toMatchObject({
    activation: "manual",
    unverifiedReason: "support-range-missing",
  });
});

test("a covering automatic option outranks a manual one", () => {
  const manual: InstrumentationOption = {
    ...native,
    id: "manual",
    supportedVersions: ">=1.0.0 <2.0.0",
    activation: "manual",
  };
  expect(
    assess({ version: "1.5.0", options: [community, manual] }).supported[0]
      ?.activation,
  ).toBe("automatic");
});
