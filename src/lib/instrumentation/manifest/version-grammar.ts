import semver from "semver";

/**
 * Package ecosystems the manifest can express supported-version ranges for.
 * The manifest always stores `supportedVersions` in semver comparator syntax
 * (e.g. `">=4.0.0 <5.0.0"`); the generator translates ecosystem-native ranges
 * into that form. Only the *declared* version (what a scanned project uses)
 * arrives in ecosystem-native syntax, so per-ecosystem coercion lives here.
 */
export const ECOSYSTEMS = [
  "npm",
  "pypi",
  "maven",
  "nuget",
  "gems",
  "gomod",
  "cargo",
  "composer",
  "hex",
] as const;

export type Ecosystem = (typeof ECOSYSTEMS)[number];

/**
 * Outcome of comparing a project's declared spec against a supported range.
 * - `in-range`: every version the spec admits is supported (subset).
 * - `overlap`: some admitted versions are supported and some are not.
 * - `out-of-range`: no admitted version is supported.
 * - `unknown`: one side could not be parsed.
 */
export type VersionMatch = "in-range" | "overlap" | "out-of-range" | "unknown";

export function isEcosystem(value: string): value is Ecosystem {
  return (ECOSYSTEMS as readonly string[]).includes(value);
}

function stripLeadingV(token: string) {
  return token.replace(/^\s*v/i, "").trim();
}

/**
 * Translate an ecosystem-native declared spec into the full semver range it
 * admits. A bare version is treated as exact for every ecosystem: Maven and
 * NuGet resolve a bare `3.5.0` to exactly that version in practice, and a
 * lockfile-resolved version is always exact. Returns null when the spec cannot
 * be expressed as a semver range.
 */
export function declaredToSemverRange(
  ecosystem: Ecosystem,
  declared: string,
): string | null {
  const raw = declared.trim();
  if (raw.length === 0) return null;

  const exact = semver.valid(stripLeadingV(raw), { loose: true });
  if (exact != null) return `=${exact}`;

  let candidate: string | null;
  switch (ecosystem) {
    case "npm":
    case "hex":
      candidate = raw;
      break;
    case "cargo":
    case "composer":
      candidate = raw
        .split(",")
        .map((part) => part.trim())
        .join(" ");
      break;
    case "gomod":
      candidate = raw
        .split(/\s+/)
        .map((token) => stripLeadingV(token))
        .join(" ");
      break;
    case "gems": {
      // Ruby release versions can carry four or more numeric segments (Rails
      // ships 7.2.3.1); semver caps at major.minor.patch, so coerce a bare
      // release to an exact three-segment version. The one-to-three-segment
      // case was already handled as exact above.
      const release = /^\d+(?:\.\d+){3,}$/.test(raw)
        ? semver.coerce(raw, { loose: true })
        : null;
      candidate =
        release != null ? `=${release.version}` : expandPessimistic(raw);
      break;
    }
    case "pypi":
      candidate = expandPep440(raw);
      break;
    case "maven":
    case "nuget": {
      const bracket = parseBracketRange(raw);
      candidate = bracket == null ? null : expandBracket(raw);
      if (candidate != null && !/^[[(]/.test(raw)) {
        // Bare Maven / NuGet version: exact, not a floor.
        const coerced = semver.coerce(stripLeadingV(raw), { loose: true });
        candidate = coerced == null ? null : `=${coerced.version}`;
      }
      break;
    }
  }

  if (candidate != null && semver.validRange(candidate) != null)
    return candidate;

  return null;
}

interface BracketRange {
  floor?: string;
  ceilingExclusive?: string;
  ceilingInclusive?: string;
}

/**
 * Parse a Maven / NuGet interval such as `[1.0,2.0)`, `[1.0,)`, `(,2.0]`, or a
 * bare `1.0` (which both ecosystems treat as `>=1.0`). Returns null when the
 * shape is not a recognized interval or bare version.
 */
function parseBracketRange(raw: string): BracketRange | null {
  const value = raw.trim();
  const interval = /^([[(])\s*([^,\])]*)\s*,\s*([^,\])]*)\s*([\])])$/.exec(
    value,
  );
  if (interval == null) {
    if (!/^v?\d+(?:\.\d+){0,2}$/.test(value)) return null;
    const bare = semver.coerce(stripLeadingV(value), { loose: true });
    return bare == null ? null : { floor: bare.version };
  }
  const [, open, lowRaw, highRaw, close] = interval;
  if (
    [lowRaw, highRaw].some(
      (bound) =>
        bound != null &&
        bound.trim() !== "" &&
        !/^v?\d+(?:\.\d+){0,2}$/.test(bound.trim()),
    )
  )
    return null;
  const low = lowRaw ? semver.coerce(lowRaw, { loose: true }) : null;
  const high = highRaw ? semver.coerce(highRaw, { loose: true }) : null;
  const range: BracketRange = {};
  if (low != null && open === "[") range.floor = low.version;
  else if (low != null && open === "(")
    range.floor = semver.inc(low, "patch") ?? low.version;
  if (high != null && close === ")") range.ceilingExclusive = high.version;
  else if (high != null && close === "]") range.ceilingInclusive = high.version;
  return range;
}

/**
 * Assess a project's declared or resolved version against a manifest
 * `supportedVersions` range. The declared spec is expanded to the full set of
 * versions it admits, then compared as a set: subset is `in-range`, partial
 * intersection is `overlap`, disjoint is `out-of-range`. Returns `"unknown"`
 * (never a false `"out-of-range"`) when either side cannot be parsed.
 */
export function matchVersion({
  ecosystem,
  declared,
  range,
}: {
  ecosystem: Ecosystem;
  declared: string | undefined;
  range: string | undefined;
}): VersionMatch {
  if (declared == null || declared.trim().length === 0) return "unknown";
  if (range == null || range.trim().length === 0) return "unknown";
  if (semver.validRange(range) == null) return "unknown";

  const declaredRange = declaredToSemverRange(ecosystem, declared);
  if (declaredRange == null) return "unknown";

  // An exact version: a plain satisfies check, prereleases included.
  if (
    declaredRange.startsWith("=") &&
    semver.valid(declaredRange.slice(1)) != null
  )
    return semver.satisfies(declaredRange.slice(1), range, {
      includePrerelease: true,
    })
      ? "in-range"
      : "out-of-range";

  // A range: compare as sets. `includePrerelease` is deliberately off here;
  // with it on, an X-range such as `5` is widened to `>=5.0.0-0` and falsely
  // intersects `<5.0.0`.
  if (
    semver.subset(declaredRange, range) ||
    coveredByUnion({ declaredRange, range })
  )
    return "in-range";
  if (semver.intersects(declaredRange, range)) return "overlap";
  return "out-of-range";
}

function coveredByUnion({
  declaredRange,
  range,
}: {
  declaredRange: string;
  range: string;
}) {
  const supported = new semver.Range(range).set;
  if (supported.length < 2) return false;
  const declared = new semver.Range(declaredRange).set;
  if (
    !clausesCovered({
      declared: declared.map(stableClause),
      supported: supported.map(stableClause),
      includePrerelease: false,
    })
  )
    return false;
  for (const clause of declared) {
    const bases = new Set(
      clause
        .filter((item) => item.value && item.semver.prerelease.length > 0)
        .map((item) => versionBase(item.semver)),
    );
    for (const base of bases) {
      const alternatives = supported.filter((option) =>
        option.some(
          (item) =>
            item.value &&
            item.semver.prerelease.length > 0 &&
            versionBase(item.semver) === base,
        ),
      );
      if (
        !clausesCovered({
          declared: [
            [
              ...clause.map((item) => item.value).filter(Boolean),
              `>=${base}-0`,
              `<${base}`,
            ],
          ],
          supported: alternatives.map((option) =>
            option.map((item) => item.value).filter(Boolean),
          ),
          includePrerelease: true,
        })
      )
        return false;
    }
  }
  return true;
}

function versionBase(version: semver.SemVer) {
  return `${version.major}.${version.minor}.${version.patch}`;
}

function stableClause(clause: readonly semver.Comparator[]) {
  return clause.flatMap((item) => {
    if (!item.value) return [];
    if (item.semver.prerelease.length === 0) return [item.value];
    if (item.operator === "" || item.operator === "=") return ["<0.0.0"];
    const operator = item.operator.startsWith(">") ? ">=" : "<";
    return [`${operator}${versionBase(item.semver)}`];
  });
}

function clausesCovered({
  declared,
  supported,
  includePrerelease,
}: {
  declared: string[][];
  supported: string[][];
  includePrerelease: boolean;
}) {
  const options = { includePrerelease };
  const nonempty = (clause: string[]) => {
    const expression = clause.join(" ") || "*";
    const minimum = semver.minVersion(new semver.Range(expression, options));
    return minimum != null && semver.satisfies(minimum, expression, options);
  };
  let remaining = declared.filter(nonempty);
  const inverse = { ">": "<=", ">=": "<", "<": ">=", "<=": ">" } as const;
  for (const clause of supported) {
    if (!nonempty(clause)) continue;
    const comparators = new semver.Range(clause.join(" ") || "*", options)
      .set[0];
    if (comparators === undefined) return false;
    remaining = remaining.flatMap((uncovered) => {
      if (
        !semver.intersects(
          uncovered.join(" ") || "*",
          clause.join(" ") || "*",
          options,
        )
      )
        return [uncovered];
      return comparators
        .flatMap((comparator) => {
          if (comparator.value === "") return [];
          const operators =
            comparator.operator === "" || comparator.operator === "="
              ? ["<", ">"]
              : [inverse[comparator.operator]];
          return operators.map((operator) => [
            ...uncovered,
            `${operator}${comparator.semver.version}`,
          ]);
        })
        .filter(nonempty);
    });
    if (remaining.length === 0) return true;
  }
  return remaining.length === 0;
}

/**
 * Normalize a runtime version declaration into a spec `matchVersion` can
 * compare against `supportedRuntimeVersions`. Handles .NET target framework
 * monikers (`net9.0`, `netcoreapp3.1`), legacy Java `1.8`, and version-file
 * prefixes (`ruby-3.2.2`, `python-3.11.4`, `v22.1.0`). Returns null for
 * declarations that carry no comparable version (e.g. `net48`).
 */
export function normalizeRuntimeVersion(
  runtime: string,
  declared: string,
): string | null {
  const raw = declared.trim();
  if (raw.length === 0) return null;
  if (runtime === "dotnet") {
    if (raw.includes(";")) {
      const versions = raw
        .split(";")
        .map((target) => normalizeRuntimeVersion(runtime, target));
      return versions.every(
        (version) => version != null && semver.valid(version) != null,
      )
        ? versions.join(" || ")
        : null;
    }
    const tfm = /^net(?:coreapp)?(\d+)\.(\d+)(?:-[A-Za-z0-9.]+)?$/i.exec(raw);
    if (tfm != null) return `${tfm[1]}.${tfm[2]}.0`;
    if (/^net\d{2,3}$/i.test(raw) || /^netstandard/i.test(raw)) return null;
  }
  if (runtime === "java") {
    const legacy = /^1\.(\d+)(?:\.\d+)?(?:_\d+)?$/.exec(raw);
    if (legacy?.[1] != null) return `${legacy[1]}.0.0`;
  }
  return raw
    .replace(/^(?:ruby|python|node|jruby|graalvm)[-@]?/i, "")
    .replace(/^v(?=\d)/i, "")
    .trim();
}

/**
 * Translate an ecosystem-native supported-version range into the semver
 * comparator syntax the manifest stores. Used by the offline generator (and its
 * validation guardrail): a range that cannot be translated is rejected before
 * it ships. Returns null when the range is not translatable.
 */
export function toSemverRange(
  ecosystem: Ecosystem,
  range: string,
): string | null {
  const raw = range.trim();
  if (raw.length === 0) return null;

  let candidate: string | null;
  switch (ecosystem) {
    case "npm":
    case "hex":
      candidate = raw;
      break;
    case "cargo":
    case "composer":
      candidate = raw
        .split(",")
        .map((part) => part.trim())
        .join(" ");
      break;
    case "gomod":
      candidate = raw
        .split(/\s+/)
        .map((token) => stripLeadingV(token))
        .join(" ");
      break;
    case "gems":
      candidate = expandPessimistic(raw);
      break;
    case "pypi":
      candidate = expandPep440(raw);
      break;
    case "maven":
    case "nuget":
      candidate = expandBracket(raw);
      break;
  }

  if (candidate == null) return null;
  return semver.validRange(candidate) != null ? candidate : null;
}

/** RubyGems `~> 8.0` → `>=8.0.0 <9.0.0`; `~> 8.0.1` → `>=8.0.1 <8.1.0`. */
function expandPessimistic(range: string): string | null {
  const parts = range.split(",").map((part) => part.trim());
  const comparators: string[] = [];
  for (const part of parts) {
    const pessimistic = /^~>\s*(.+)$/.exec(part);
    if (pessimistic?.[1] != null) {
      const expanded = pessimisticToRange(pessimistic[1].trim());
      if (expanded == null) return null;
      comparators.push(expanded);
      continue;
    }
    comparators.push(tightenOperatorSpacing(part));
  }
  return comparators.join(" ");
}

function pessimisticToRange(version: string): string | null {
  const coerced = semver.coerce(version, { loose: true });
  if (coerced == null) return null;
  // The pessimistic operator (`~>` / `~=`) increments the second-to-last
  // specified segment. With one or two segments that is the major (lock major,
  // let minor grow); with three or more it is the minor (lock major.minor).
  const segments = version.split(".").length;
  const ceiling =
    segments <= 2
      ? `${coerced.major + 1}.0.0`
      : `${coerced.major}.${coerced.minor + 1}.0`;
  return `>=${coerced.version} <${ceiling}`;
}

/** PEP 440 `>=1.0,<2.0` → `>=1.0.0 <2.0.0`; `~=1.4` → `>=1.4.0 <2.0.0`. */
function expandPep440(range: string): string | null {
  const parts = range.split(",").map((part) => part.trim());
  const comparators: string[] = [];
  for (const part of parts) {
    if (part.startsWith("!=")) return null;
    const compatible = /^~=\s*(\d+\.\d+(?:\.\d+)?)$/.exec(part);
    if (compatible?.[1] != null) {
      const expanded = pessimisticToRange(compatible[1].trim());
      if (expanded == null) return null;
      comparators.push(expanded);
      continue;
    }
    const exact = /^==\s*(\d+(?:\.\d+){0,2})(\.\*)?$/.exec(part);
    if (exact?.[1] != null) {
      const coerced = semver.coerce(exact[1], { loose: true });
      if (coerced == null) return null;
      if (exact[2] != null) {
        const segments = exact[1].split(".").length;
        const ceiling =
          segments === 1
            ? `${coerced.major + 1}.0.0`
            : segments === 2
              ? `${coerced.major}.${coerced.minor + 1}.0`
              : `${coerced.major}.${coerced.minor}.${coerced.patch + 1}`;
        comparators.push(`>=${coerced.version} <${ceiling}`);
      } else {
        comparators.push(`=${coerced.version}`);
      }
      continue;
    }
    comparators.push(tightenOperatorSpacing(part));
  }
  return comparators.join(" ");
}

/** Collapse the space after a comparator operator (`>= 3.1.0` → `>=3.1.0`). */
function tightenOperatorSpacing(part: string): string {
  return part.replace(/([<>=!~^]=?)\s+/g, "$1");
}

/** Maven / NuGet `[1.0,2.0)` → `>=1.0.0 <2.0.0`; bare `1.0` → `>=1.0.0`. */
function expandBracket(range: string): string | null {
  const parsed = parseBracketRange(range);
  if (parsed == null) return null;
  const comparators: string[] = [];
  if (parsed.floor != null) comparators.push(`>=${parsed.floor}`);
  if (parsed.ceilingExclusive != null)
    comparators.push(`<${parsed.ceilingExclusive}`);
  if (parsed.ceilingInclusive != null)
    comparators.push(`<=${parsed.ceilingInclusive}`);
  return comparators.length > 0 ? comparators.join(" ") : null;
}
