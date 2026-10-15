import { describe, expect, test } from "bun:test";
import {
  matchVersion,
  normalizeRuntimeVersion,
  toSemverRange,
  type Ecosystem,
  type VersionMatch,
} from "./version-grammar";

describe("normalizeRuntimeVersion", () => {
  test("translates .NET target framework monikers", () => {
    expect(normalizeRuntimeVersion("dotnet", "net9.0")).toBe("9.0.0");
    expect(normalizeRuntimeVersion("dotnet", "netcoreapp3.1")).toBe("3.1.0");
    expect(normalizeRuntimeVersion("dotnet", "netstandard2.0")).toBeNull();
  });
  test("translates .NET Framework monikers and legacy versions", () => {
    expect(normalizeRuntimeVersion("dotnet", "net48")).toBe("4.8.0");
    expect(normalizeRuntimeVersion("dotnet", "net472")).toBe("4.7.2");
    expect(normalizeRuntimeVersion("dotnet", "net462")).toBe("4.6.2");
    expect(normalizeRuntimeVersion("dotnet", "v4.7.2")).toBe("4.7.2");
    expect(normalizeRuntimeVersion("dotnet", "v4.8")).toBe("4.8.0");
    expect(normalizeRuntimeVersion("dotnet", "net48;net8.0")).toBe(
      "4.8.0 || 8.0.0",
    );
  });
  test("translates legacy Java versions", () => {
    expect(normalizeRuntimeVersion("java", "1.8")).toBe("8.0.0");
    expect(normalizeRuntimeVersion("java", "17")).toBe("17");
  });
  test("strips version-file prefixes", () => {
    expect(normalizeRuntimeVersion("ruby", "ruby-3.2.2")).toBe("3.2.2");
    expect(normalizeRuntimeVersion("python", "python-3.11.4")).toBe("3.11.4");
    expect(normalizeRuntimeVersion("nodejs", "v22.1.0")).toBe("22.1.0");
    expect(normalizeRuntimeVersion("nodejs", ">=18")).toBe(">=18");
  });
});

describe("matchVersion", () => {
  const cases: {
    ecosystem: Ecosystem;
    declared: string;
    range: string;
    expected: VersionMatch;
  }[] = [
    {
      ecosystem: "maven",
      declared: "[1.0,2.0),[3.0,4.0)",
      range: ">=1.5.0",
      expected: "unknown",
    },
    {
      ecosystem: "nuget",
      declared: "$(Version1)",
      range: ">=1.0.0",
      expected: "unknown",
    },
    {
      ecosystem: "pypi",
      declared: "==1.5.0,>=1.0",
      range: ">=1.0.0 <2.0.0",
      expected: "in-range",
    },
    {
      ecosystem: "pypi",
      declared: ">=3.2,!=4.0.*,<5.0",
      range: ">=4.0.0",
      expected: "unknown",
    },
    {
      ecosystem: "pypi",
      declared: "!=1.5.0",
      range: ">=1.0.0 <2.0.0",
      expected: "unknown",
    },
    {
      ecosystem: "composer",
      declared: ">=1.0,<2.0",
      range: ">=1.5.0",
      expected: "overlap",
    },
    {
      ecosystem: "cargo",
      declared: ">=1.2, <1.5",
      range: ">=1.4.0",
      expected: "overlap",
    },
    {
      ecosystem: "pypi",
      declared: "==4.0.*",
      range: ">=4.0.0 <4.1.0",
      expected: "in-range",
    },
    {
      ecosystem: "pypi",
      declared: "==4.*",
      range: ">=4.0.0 <4.1.0",
      expected: "overlap",
    },
    {
      ecosystem: "pypi",
      declared: "==0.*",
      range: ">=0.0.0 <1.0.0",
      expected: "in-range",
    },
    {
      ecosystem: "pypi",
      declared: "==0.*",
      range: ">=0.0.0 <0.1.0",
      expected: "overlap",
    },
    {
      ecosystem: "pypi",
      declared: "==1.5rc1",
      range: ">=1.0.0",
      expected: "unknown",
    },
    {
      ecosystem: "npm",
      declared: "https://example.invalid/v4.0.0",
      range: ">=4.0.0",
      expected: "unknown",
    },
    // npm: concrete and range-shaped declared specs.
    {
      ecosystem: "npm",
      declared: "4.18.2",
      range: ">=4.0.0 <5.0.0",
      expected: "in-range",
    },
    {
      ecosystem: "npm",
      declared: "^4.18.0",
      range: ">=4.0.0 <5.0.0",
      expected: "in-range",
    },
    {
      ecosystem: "npm",
      declared: "5.0.0",
      range: ">=4.0.0 <5.0.0",
      expected: "out-of-range",
    },
    {
      ecosystem: "npm",
      declared: "5",
      range: ">=4.0.0 <5.0.0",
      expected: "out-of-range",
    },
    {
      ecosystem: "npm",
      declared: ">=4 <6",
      range: ">=4.0.0 <5.0.0",
      expected: "overlap",
    },
    {
      ecosystem: "npm",
      declared: "^4.18.0",
      range: ">=4.0.0 <6.0.0",
      expected: "in-range",
    },
    {
      ecosystem: "npm",
      declared: "^4",
      range: ">=4.18.0 <5.0.0",
      expected: "overlap",
    },
    // open-ended supported range.
    {
      ecosystem: "npm",
      declared: "22.1.0",
      range: ">=14",
      expected: "in-range",
    },
    {
      ecosystem: "npm",
      declared: "12.0.0",
      range: ">=14",
      expected: "out-of-range",
    },
    // gomod: leading v is stripped.
    {
      ecosystem: "gomod",
      declared: "v1.24.0",
      range: ">=1.23.0",
      expected: "in-range",
    },
    {
      ecosystem: "gomod",
      declared: "v1.20.0",
      range: ">=1.23.0",
      expected: "out-of-range",
    },
    // pypi floor coercion.
    {
      ecosystem: "pypi",
      declared: "==2.32.0",
      range: ">=2.0.0",
      expected: "in-range",
    },
    {
      ecosystem: "pypi",
      declared: ">=1.0",
      range: ">=2.0.0",
      expected: "overlap",
    },
    {
      ecosystem: "pypi",
      declared: "==1.4.2",
      range: ">=2.0.0",
      expected: "out-of-range",
    },
    {
      ecosystem: "pypi",
      declared: "~=1.4",
      range: ">=1.0.0 <2.0.0",
      expected: "in-range",
    },
    // rubygems pessimistic declared spec.
    {
      ecosystem: "gems",
      declared: "~> 8.0",
      range: ">=7.0.0",
      expected: "in-range",
    },
    {
      ecosystem: "gems",
      declared: ">= 6.1",
      range: ">=7.0.0",
      expected: "overlap",
    },
    {
      ecosystem: "gems",
      declared: "~> 6.1",
      range: ">=7.0.0",
      expected: "out-of-range",
    },
    // rubygems release versions carry a fourth segment (Rails 7.2.3.1); it is
    // coerced to major.minor.patch rather than false-flagged as unparseable.
    {
      ecosystem: "gems",
      declared: "7.2.3.1",
      range: ">=6.0.0",
      expected: "in-range",
    },
    {
      ecosystem: "gems",
      declared: "6.1.7.6",
      range: ">=7.0.0 <8.0.0",
      expected: "out-of-range",
    },
    // maven / nuget concrete declared versions are exact, not floors.
    {
      ecosystem: "maven",
      declared: "3.5.0",
      range: ">=3.0.0 <4.0.0",
      expected: "in-range",
    },
    {
      ecosystem: "maven",
      declared: "[3.0,5.0)",
      range: ">=3.0.0 <4.0.0",
      expected: "overlap",
    },
    {
      ecosystem: "nuget",
      declared: "9.0.0",
      range: ">=8.0.0",
      expected: "in-range",
    },
    // A bare partial version is one release on PyPI, RubyGems and Composer.
    {
      ecosystem: "pypi",
      declared: "5.0",
      range: ">=5.0.1",
      expected: "out-of-range",
    },
    {
      ecosystem: "pypi",
      declared: "24.2",
      range: ">=24.0.0 <25.0.0",
      expected: "in-range",
    },
    {
      ecosystem: "gems",
      declared: "7.1",
      range: ">=7.1.1",
      expected: "out-of-range",
    },
    {
      ecosystem: "composer",
      declared: "5.4",
      range: ">=5.4.1",
      expected: "out-of-range",
    },
    // Maven release qualifiers are dropped; pre-release ones stay unknown.
    {
      ecosystem: "maven",
      declared: "4.1.100.Final",
      range: ">=4.0.0 <5.0.0",
      expected: "in-range",
    },
    {
      ecosystem: "maven",
      declared: "3.10.6.Final",
      range: ">=4.0.0 <5.0.0",
      expected: "out-of-range",
    },
    {
      ecosystem: "maven",
      declared: "5.3.9.RELEASE",
      range: ">=5.0.0",
      expected: "in-range",
    },
    {
      ecosystem: "maven",
      declared: "[4.1.0.Final,5.0)",
      range: ">=4.0.0 <5.0.0",
      expected: "in-range",
    },
    {
      ecosystem: "maven",
      declared: "6.0.0.M2",
      range: ">=5.0.0",
      expected: "unknown",
    },
    // prerelease is considered.
    {
      ecosystem: "npm",
      declared: "5.0.0-beta.1",
      range: ">=5.0.0-0 <6.0.0",
      expected: "in-range",
    },
  ];

  for (const { ecosystem, declared, range, expected } of cases) {
    test(`${ecosystem} ${declared} vs ${range} → ${expected}`, () => {
      expect(matchVersion({ ecosystem, declared, range })).toBe(expected);
    });
  }

  test("unparseable declared spec degrades to unknown", () => {
    expect(
      matchVersion({ ecosystem: "npm", declared: "next", range: ">=4.0.0" }),
    ).toBe("unknown");
  });

  test("unparseable range degrades to unknown", () => {
    expect(
      matchVersion({ ecosystem: "npm", declared: "4.0.0", range: "garbage!!" }),
    ).toBe("unknown");
  });

  test("missing declared or range is unknown", () => {
    expect(
      matchVersion({ ecosystem: "npm", declared: undefined, range: ">=1" }),
    ).toBe("unknown");
    expect(
      matchVersion({ ecosystem: "npm", declared: "1.0.0", range: undefined }),
    ).toBe("unknown");
  });
});

describe("toSemverRange", () => {
  const cases: {
    ecosystem: Ecosystem;
    input: string;
    floorSatisfies: string;
  }[] = [
    { ecosystem: "gems", input: "~> 8.0", floorSatisfies: "8.0.0" },
    { ecosystem: "pypi", input: ">=1.0,<2.0", floorSatisfies: "1.5.0" },
    { ecosystem: "pypi", input: "~=1.4", floorSatisfies: "1.9.0" },
    { ecosystem: "maven", input: "[3.0,4.0)", floorSatisfies: "3.5.0" },
    { ecosystem: "nuget", input: "[8.0,)", floorSatisfies: "9.0.0" },
    { ecosystem: "maven", input: "(,2.0]", floorSatisfies: "1.9.0" },
  ];

  for (const { ecosystem, input, floorSatisfies } of cases) {
    test(`${ecosystem} ${input} → valid semver range containing ${floorSatisfies}`, () => {
      const translated = toSemverRange(ecosystem, input);
      expect(translated).not.toBeNull();
      expect(
        matchVersion({
          ecosystem,
          declared: floorSatisfies,
          range: translated!,
        }),
      ).toBe("in-range");
    });
  }

  test("pessimistic upper bound excludes the next minor", () => {
    const translated = toSemverRange("gems", "~> 8.0.1");
    expect(
      matchVersion({
        ecosystem: "gems",
        declared: "8.1.0",
        range: translated!,
      }),
    ).toBe("out-of-range");
  });

  test("returns null for an untranslatable range", () => {
    expect(toSemverRange("maven", "not-a-range")).toBeNull();
  });
});
