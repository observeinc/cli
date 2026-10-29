import type { SourceDatasetUpdateRequest } from "../../rest/generated";

export type ObjectTags = NonNullable<SourceDatasetUpdateRequest["objectTags"]>;

const OBJECT_TAG_USAGE =
  'Use key=value, or a JSON object such as \'{"key":["value"]}\' for keys that contain =.';

/**
 * Parse one `--object-tag` occurrence: `key=value` (split on the first `=`),
 * or a JSON object of key to value or list of values.
 */
export function parseObjectTag(value: string): ObjectTags {
  if (value.trim().startsWith("{")) {
    return parseObjectTagsJson(value);
  }
  const eq = value.indexOf("=");
  const key = eq > 0 ? value.slice(0, eq).trim() : "";
  if (!key) {
    throw new Error(`Invalid object tag "${value}". ${OBJECT_TAG_USAGE}`);
  }
  return { [key]: [value.slice(eq + 1).trim()] };
}

function parseObjectTagsJson(value: string): ObjectTags {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`Invalid object tag JSON "${value}". ${OBJECT_TAG_USAGE}`);
  }
  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Invalid object tag JSON "${value}". ${OBJECT_TAG_USAGE}`);
  }
  const out: ObjectTags = {};
  for (const [key, tagValue] of Object.entries(parsed)) {
    const values: unknown[] = Array.isArray(tagValue) ? tagValue : [tagValue];
    if (!key || !values.every((v) => typeof v === "string")) {
      throw new Error(
        `Invalid object tag JSON "${value}": each key needs a string or a list of strings.`,
      );
    }
    out[key] = values;
  }
  return out;
}

/** Merge repeated `--object-tag` flags into the API's tag map. */
export function buildObjectTags(tags: ObjectTags[]): ObjectTags {
  const out: ObjectTags = {};
  for (const tagMap of tags) {
    for (const [key, values] of Object.entries(tagMap)) {
      (out[key] ??= []).push(...(values ?? []));
    }
  }
  return out;
}

export function parseRetentionDays(value: string): number {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) {
    throw new Error("Retention days must be a non-negative integer");
  }
  return num;
}

export interface UpdateFlags {
  label?: string;
  description?: string;
  clearDescription?: boolean;
  icon?: string;
  clearIcon?: boolean;
  objectTag?: ObjectTags[];
  clearObjectTags?: boolean;
  retentionDays?: number;
  clearRetention?: boolean;
}

function exclusive(a: unknown, b: boolean | undefined, names: string): void {
  if (a !== undefined && b) {
    throw new Error(`${names} cannot be used together`);
  }
}

/**
 * Build the JSON Merge Patch body: only flags that were passed are sent, and
 * the --clear-* flags send `null` (or `{}` for tags, which reject `null`).
 */
export function buildUpdateBody(
  flags: UpdateFlags,
): SourceDatasetUpdateRequest {
  exclusive(
    flags.description,
    flags.clearDescription,
    "--description and --clear-description",
  );
  exclusive(flags.icon, flags.clearIcon, "--icon and --clear-icon");
  exclusive(
    flags.objectTag,
    flags.clearObjectTags,
    "--object-tag and --clear-object-tags",
  );
  exclusive(
    flags.retentionDays,
    flags.clearRetention,
    "--retention-days and --clear-retention",
  );

  const body: SourceDatasetUpdateRequest = {};
  if (flags.label !== undefined) body.label = flags.label;
  if (flags.description !== undefined) body.description = flags.description;
  if (flags.clearDescription) body.description = null;
  if (flags.icon !== undefined) body.icon = flags.icon;
  if (flags.clearIcon) body.icon = null;
  if (flags.objectTag !== undefined) {
    body.objectTags = buildObjectTags(flags.objectTag);
  }
  if (flags.clearObjectTags) body.objectTags = {};
  if (flags.retentionDays !== undefined) {
    body.dataRetentionDays = flags.retentionDays;
  }
  if (flags.clearRetention) body.dataRetentionDays = null;

  if (Object.keys(body).length === 0) {
    throw new Error(
      "Nothing to update. Provide at least one of --label, --description, --icon, --object-tag, --retention-days, or a --clear-* flag.",
    );
  }
  return body;
}
