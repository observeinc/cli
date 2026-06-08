export type Variables = Record<string, string>;

/**
 * Parses --variables input as either:
 *   - JSON array: '[{"name":"k","value":"v"},...]'
 *   - key=value pairs: 'k=v,k2=v2'
 */
export function parseVariables(raw: string | undefined): Variables {
  if (!raw) return {};
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed) as { name: string; value: string }[];
    return Object.fromEntries(parsed.map(({ name, value }) => [name, value]));
  }
  const result: Variables = {};
  for (const pair of trimmed.split(",")) {
    const idx = pair.indexOf("=");
    if (idx === -1)
      throw new Error(`Invalid variable "${pair}" — expected key=value format`);
    result[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
  }
  return result;
}

export function variablesToArray(
  vars: Variables,
): { name: string; value: string }[] {
  return Object.entries(vars).map(([name, value]) => ({ name, value }));
}
