export function parseNonNegativeInt(value: string): number {
  const num = Number(value);
  if (isNaN(num) || num < 0 || !Number.isInteger(num)) {
    throw new Error("Value must be a non-negative integer");
  }
  return num;
}

/**
 * Build a `--sort` parser that accepts one of `fields`, optionally prefixed
 * with `-` for descending order, and passes it through as the API's orderBy.
 */
export function makeSortFieldParser(
  fields: readonly string[],
): (value: string) => string {
  return (value) => {
    const field = value.startsWith("-") ? value.slice(1) : value;
    if (!fields.includes(field)) {
      throw new Error(
        `Invalid sort field: "${value}". Available fields: ${fields.join(", ")} (prefix with - for descending)`,
      );
    }
    return value;
  };
}

/** Build a `--fields` parser for a comma-separated list of `fields`. */
export function makeFieldListParser<Field extends string>(
  fields: readonly Field[],
): (value: string) => Field[] {
  const known: ReadonlySet<string> = new Set(fields);
  const isField = (value: string): value is Field => known.has(value);
  return (value) =>
    value.split(",").map((f) => {
      const field = f.trim();
      if (!isField(field)) {
        throw new Error(
          `Invalid field: "${field}". Available fields: ${fields.join(", ")}`,
        );
      }
      return field;
    });
}

export function parseMonitorId(value: string): number {
  if (value !== value.trim()) {
    throw new Error("Monitor ID must be a positive integer");
  }
  const num = Number(value);
  if (
    isNaN(num) ||
    !Number.isInteger(num) ||
    num <= 0 ||
    num > Number.MAX_SAFE_INTEGER
  ) {
    throw new Error("Monitor ID must be a positive integer");
  }
  return num;
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function parseJsonFile<T>(content: string, flag: string): T {
  try {
    return JSON.parse(content) as T;
  } catch (cause) {
    throw new Error(
      `Failed to parse ${flag}: ${cause instanceof Error ? cause.message : String(cause)}`,
      { cause },
    );
  }
}
