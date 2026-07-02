export function parseNonNegativeInt(value: string): number {
  const num = Number(value);
  if (isNaN(num) || num < 0 || !Number.isInteger(num)) {
    throw new Error("Value must be a non-negative integer");
  }
  return num;
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
