export type BazelLiteral =
  | { kind: "string"; value: string }
  | { kind: "boolean"; value: boolean }
  | { kind: "strings"; value: string[] }
  | { kind: "dynamic"; expression: string };

export interface BazelRuleCall {
  rule: string;
  attributes: Map<string, BazelLiteral>;
  start: number;
  end: number;
}

/** Parse top-level Starlark calls and literal keyword attributes without evaluation. */
export function parseBazelRuleCalls(content: string): BazelRuleCall[] {
  const calls: BazelRuleCall[] = [];
  const searchable = maskStringsAndComments(content);
  let depth = 0;
  for (let index = 0; index < searchable.length; index++) {
    const char = searchable[index] ?? "";
    if ("([{".includes(char)) {
      depth++;
      continue;
    }
    if (")]}".includes(char)) {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth !== 0 || !/[A-Za-z_]/.test(char)) continue;
    const identifier = /^[A-Za-z_][A-Za-z0-9_]*/.exec(
      searchable.slice(index),
    )?.[0];
    if (identifier == null) continue;
    const open = skipWhitespace(searchable, index + identifier.length);
    if (searchable[open] !== "(") {
      index += identifier.length - 1;
      continue;
    }
    const close = matchingDelimiter(content, open, "(", ")");
    if (close == null) {
      const nextLine = searchable.indexOf("\n", open);
      if (nextLine < 0) break;
      index = nextLine;
      depth = 0;
      continue;
    }
    calls.push({
      rule: identifier,
      attributes: parseAttributes(content.slice(open + 1, close)),
      start: index,
      end: close + 1,
    });
    index = close;
  }
  return calls;
}

export interface BazelLoad {
  label: string;
  symbols: { local: string; exported: string }[];
}

/** Parse top-level `load("label", "sym", local = "exported")` statements. */
export function parseBazelLoads(content: string): BazelLoad[] {
  const masked = maskStringsAndComments(content);
  const loads: BazelLoad[] = [];
  for (let index = 0; index < masked.length; index++) {
    if (!/[A-Za-z_]/.test(masked[index] ?? "")) continue;
    const identifier = /^[A-Za-z_][A-Za-z0-9_]*/.exec(masked.slice(index))?.[0];
    if (identifier == null) continue;
    if (identifier !== "load") {
      index += identifier.length - 1;
      continue;
    }
    const open = skipWhitespace(masked, index + identifier.length);
    if (masked[open] !== "(") {
      index += identifier.length - 1;
      continue;
    }
    const close = matchingDelimiter(content, open, "(", ")");
    if (close == null) break;
    let label: string | null = null;
    const symbols: { local: string; exported: string }[] = [];
    for (const segment of splitTopLevel(content.slice(open + 1, close), ",")) {
      const trimmed = segment.trim();
      if (trimmed === "") continue;
      const assignment = topLevelAssignment(trimmed);
      if (assignment != null) {
        const exported = parseString(assignment.value.trim());
        if (exported != null)
          symbols.push({ local: assignment.name, exported });
        continue;
      }
      const value = parseString(trimmed);
      if (value == null) continue;
      if (label == null) label = value;
      else symbols.push({ local: value, exported: value });
    }
    if (label != null) loads.push({ label, symbols });
    index = close;
  }
  return loads;
}

/**
 * Extract top-level `def name(...)` blocks with their bodies. Bodies are
 * returned string/comment-masked (spaces substituted) so reference scanning is
 * not fooled by literals; indentation is preserved.
 */
export function parseBazelDefs(
  content: string,
): { name: string; body: string }[] {
  const masked = maskStringsAndComments(content);
  const lines = masked.split("\n");
  const defs: { name: string; body: string }[] = [];
  for (let index = 0; index < lines.length; index++) {
    const match = /^(\s*)def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/.exec(
      lines[index] ?? "",
    );
    if (match == null) continue;
    const indent = match[1]?.length ?? 0;
    const name = match[2] ?? "";
    const bodyLines: string[] = [];
    let cursor = index + 1;
    for (; cursor < lines.length; cursor++) {
      const line = lines[cursor] ?? "";
      if (line.trim() === "") {
        bodyLines.push(line);
        continue;
      }
      if ((/^(\s*)/.exec(line)?.[1]?.length ?? 0) <= indent) break;
      bodyLines.push(line);
    }
    defs.push({ name, body: bodyLines.join("\n") });
    index = cursor - 1;
  }
  return defs;
}

function parseAttributes(body: string) {
  const attributes = new Map<string, BazelLiteral>();
  for (const segment of splitTopLevel(body, ",")) {
    const assignment = topLevelAssignment(segment);
    if (assignment != null)
      attributes.set(assignment.name, parseLiteral(assignment.value));
  }
  return attributes;
}

function topLevelAssignment(segment: string) {
  const masked = maskStringsAndComments(segment);
  let depth = 0;
  for (let index = 0; index < masked.length; index++) {
    const char = masked.charAt(index);
    if ("([{".includes(char)) depth++;
    else if (")]}".includes(char)) depth--;
    else if (char === "=" && depth === 0) {
      const name = segment.slice(0, index).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return null;
      return { name, value: segment.slice(index + 1).trim() };
    }
  }
  return null;
}

function parseLiteral(expression: string): BazelLiteral {
  const text = expression.trim();
  const string = parseString(text);
  if (string != null) return { kind: "string", value: string };
  if (text === "True" || text === "False" || text === "1" || text === "0")
    return { kind: "boolean", value: text === "True" || text === "1" };
  if (
    text.startsWith("[") &&
    matchingDelimiter(text, 0, "[", "]") === text.length - 1
  ) {
    const values: string[] = [];
    for (const item of splitTopLevel(text.slice(1, -1), ",")) {
      if (item.trim() === "") continue;
      const value = parseString(item.trim());
      if (value == null) return { kind: "dynamic", expression: text };
      values.push(value);
    }
    return { kind: "strings", value: values };
  }
  return { kind: "dynamic", expression: text };
}

function parseString(text: string) {
  const match = /^(?:r|b|u|br|rb)?(["'])/i.exec(text);
  if (match == null) return null;
  const quote = match[1];
  let escaped = false;
  for (let index = match[0].length; index < text.length; index++) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (text[index] === "\\") {
      escaped = true;
      continue;
    }
    if (text[index] === quote)
      return index === text.length - 1
        ? text.slice(match[0].length, index)
        : null;
  }
  return null;
}

function splitTopLevel(content: string, separator: string) {
  const masked = maskStringsAndComments(content);
  const segments: string[] = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < masked.length; index++) {
    const char = masked.charAt(index);
    if ("([{".includes(char)) depth++;
    else if (")]}".includes(char)) depth--;
    else if (char === separator && depth === 0) {
      segments.push(content.slice(start, index));
      start = index + 1;
    }
  }
  segments.push(content.slice(start));
  return segments;
}

function matchingDelimiter(
  content: string,
  open: number,
  opening: string,
  closing: string,
) {
  let depth = 0;
  let quote: string | null = null;
  let escaped = false;
  let comment = false;
  for (let index = open; index < content.length; index++) {
    const char = content.charAt(index);
    if (comment) {
      if (char === "\n") comment = false;
      continue;
    }
    if (quote != null) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "#") comment = true;
    else if (char === '"' || char === "'") quote = char;
    else if (char === opening) depth++;
    else if (char === closing && --depth === 0) return index;
  }
  return null;
}

function skipWhitespace(content: string, start: number) {
  let index = start;
  while (/\s/.test(content[index] ?? "")) index++;
  return index;
}

function maskStringsAndComments(content: string) {
  const chars = content.split("");
  let quote: string | null = null;
  let escaped = false;
  let comment = false;
  for (let index = 0; index < chars.length; index++) {
    const char = content.charAt(index);
    if (comment) {
      if (char === "\n") comment = false;
      else chars[index] = " ";
      continue;
    }
    if (quote != null) {
      chars[index] = " ";
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "#") {
      chars[index] = " ";
      comment = true;
    } else if (char === '"' || char === "'") {
      chars[index] = " ";
      quote = char;
    }
  }
  return chars.join("");
}
