import type {
  ObjectTags,
  SourceDatasetUpdateRequest,
} from "../../rest/source-dataset/types";

/** Parse one `--tag key=value` occurrence. */
export function parseTag(value: string): [string, string] {
  const eq = value.indexOf("=");
  const key = eq > 0 ? value.slice(0, eq).trim() : "";
  if (!key) {
    throw new Error(`Invalid tag "${value}". Use key=value.`);
  }
  return [key, value.slice(eq + 1).trim()];
}

/** Fold repeated `--tag key=value` flags into the API's tag map. */
export function buildObjectTags(tags: [string, string][]): ObjectTags {
  const out: ObjectTags = {};
  for (const [key, value] of tags) {
    (out[key] ??= []).push(value);
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
  tag?: [string, string][];
  clearTags?: boolean;
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
  exclusive(flags.tag, flags.clearTags, "--tag and --clear-tags");
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
  if (flags.tag !== undefined) body.objectTags = buildObjectTags(flags.tag);
  if (flags.clearTags) body.objectTags = {};
  if (flags.retentionDays !== undefined) {
    body.dataRetentionDays = flags.retentionDays;
  }
  if (flags.clearRetention) body.dataRetentionDays = null;

  if (Object.keys(body).length === 0) {
    throw new Error(
      "Nothing to update. Provide at least one of --label, --description, --icon, --tag, --retention-days, or a --clear-* flag.",
    );
  }
  return body;
}
