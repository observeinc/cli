import {
  DashboardCreateRequestSchemaVersion,
  type DashboardContent,
  type DashboardCreateRequest,
  type DashboardUpdateRequest,
} from "../../rest/generated";

/** Fields `create` and `update` accept from a --file payload. */
const PATCHABLE_FIELDS = [
  "schemaVersion",
  "name",
  "description",
  "visibility",
  "objectTags",
  "definition",
] as const;

/** Human-readable list for help text and error messages. */
export const PATCHABLE_FIELD_LIST = PATCHABLE_FIELDS.join(", ");

/**
 * Narrow a `definition` read from a --file payload. The server owns full
 * schema validation; this only rejects shapes that are obviously not a
 * dashboard document.
 */
function assertDashboardDefinition(
  value: unknown,
): asserts value is DashboardContent {
  if (!isPlainObject(value)) {
    throw new Error('--file must contain a "definition" object.');
  }
  if (!isPlainObject(value.layout)) {
    throw new Error('--file "definition" must contain a "layout" object.');
  }
}

/**
 * Build a create body from a --file payload. Server-assigned fields (id,
 * createdAt, updatedAt, createdBy, updatedBy, managedBy) are dropped, so a
 * document taken from `dashboard view --json` can be used as a template.
 */
export function buildDashboardCreateRequest(
  parsed: Record<string, unknown>,
): DashboardCreateRequest {
  if (typeof parsed.name !== "string" || parsed.name === "") {
    throw new Error('--file must contain a "name" field (non-empty string).');
  }
  if (parsed.schemaVersion !== 2) {
    throw new Error('--file must contain "schemaVersion": 2.');
  }
  assertDashboardDefinition(parsed.definition);

  return {
    schemaVersion: DashboardCreateRequestSchemaVersion.NUMBER_2,
    name: parsed.name,
    definition: parsed.definition,
    ...(parsed.description !== undefined && {
      description: parsed.description as string | null,
    }),
    ...(parsed.visibility !== undefined && {
      visibility: parsed.visibility as DashboardCreateRequest["visibility"],
    }),
    ...(parsed.objectTags !== undefined && {
      objectTags: parsed.objectTags as DashboardCreateRequest["objectTags"],
    }),
  };
}

/**
 * Build a merge patch (RFC 7396) from a --file payload: only keys present in
 * the file are sent, so omitted fields stay unchanged. Throws when the file
 * nulls a field the API does not allow to be cleared.
 */
export function buildDashboardPatch(
  parsed: Record<string, unknown>,
): DashboardUpdateRequest {
  for (const field of PATCHABLE_FIELDS) {
    // `description` is the one field where null is meaningful: it clears the
    // value. Every other field is omitted to leave it unchanged.
    if (
      field !== "description" &&
      Object.hasOwn(parsed, field) &&
      parsed[field] === null
    ) {
      throw new Error(
        `--file sets "${field}" to null, which the API rejects. ` +
          "Omit the field to leave it unchanged.",
      );
    }
  }

  if (Object.hasOwn(parsed, "schemaVersion") && parsed.schemaVersion !== 2) {
    throw new Error('--file "schemaVersion" must be 2 when present.');
  }

  if (Object.hasOwn(parsed, "definition")) {
    assertDashboardDefinition(parsed.definition);
  }

  const patch = Object.fromEntries(
    PATCHABLE_FIELDS.filter((field) => Object.hasOwn(parsed, field)).map(
      (field) => [field, parsed[field]],
    ),
  ) as DashboardUpdateRequest;

  if (Object.keys(patch).length === 0) {
    throw new Error(
      `--file contains no patchable fields. Patchable: ${PATCHABLE_FIELD_LIST}.`,
    );
  }

  return patch;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}
