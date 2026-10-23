import { parseJsonFile } from "../../../lib/parsers";
import type {
  AttachDatasetRequest,
  DatasetKind,
  DatasetSpec,
  SchemaMapping,
  TableUpdateRequest,
  TrackTableRequest,
} from "../../../rest/inbound-share/types";

export function parseSchemaMapping(value: string): SchemaMapping {
  const parsed = parseJsonFile<unknown>(value, "--schema-mapping");
  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(
      '--schema-mapping must be a JSON object, e.g. {"TS":{"type":"timestamp","conversion":"MillisecondsToTimestamp"}}',
    );
  }
  return parsed as SchemaMapping;
}

export interface TrackFlags {
  schema: string;
  table: string;
  datasetLabel: string;
  kind: DatasetKind;
  description?: string;
  validFrom?: string;
  validTo?: string;
  schemaMapping?: SchemaMapping;
}

export type DatasetFlags = Pick<
  TrackFlags,
  "datasetLabel" | "kind" | "validFrom" | "validTo" | "schemaMapping"
>;

/** Event needs --valid-from; Interval needs both; Table takes neither. */
function checkKindFields(flags: DatasetFlags): void {
  const hasFrom = flags.validFrom !== undefined;
  const hasTo = flags.validTo !== undefined;
  if (flags.kind === "Table" && (hasFrom || hasTo)) {
    throw new Error("--kind Table takes no --valid-from or --valid-to.");
  }
  if (flags.kind === "Event" && (!hasFrom || hasTo)) {
    throw new Error("--kind Event needs --valid-from and no --valid-to.");
  }
  if (flags.kind === "Interval" && (!hasFrom || !hasTo)) {
    throw new Error("--kind Interval needs both --valid-from and --valid-to.");
  }
}

export function buildTrackBody(flags: TrackFlags): TrackTableRequest {
  checkKindFields(flags);
  const body: TrackTableRequest = {
    schemaName: flags.schema,
    tableName: flags.table,
    datasetLabel: flags.datasetLabel,
    datasetKind: flags.kind,
  };
  if (flags.description !== undefined) body.description = flags.description;
  if (flags.validFrom !== undefined) body.validFromField = flags.validFrom;
  if (flags.validTo !== undefined) body.validToField = flags.validTo;
  if (flags.schemaMapping !== undefined) {
    body.schemaMapping = flags.schemaMapping;
  }
  return body;
}

export function buildAttachBody(flags: DatasetFlags): AttachDatasetRequest {
  checkKindFields(flags);
  const dataset: DatasetSpec = {
    label: flags.datasetLabel,
    kind: flags.kind,
  };
  if (flags.validFrom !== undefined) dataset.validFromField = flags.validFrom;
  if (flags.validTo !== undefined) dataset.validToField = flags.validTo;
  if (flags.schemaMapping !== undefined) {
    dataset.schemaMapping = flags.schemaMapping;
  }
  return { dataset };
}

export interface TableUpdateFlags {
  description?: string;
  datasetLabel?: string;
  validFrom?: string;
  validTo?: string;
  schemaMapping?: SchemaMapping;
}

export function buildTableUpdateBody(
  flags: TableUpdateFlags,
): TableUpdateRequest {
  const body: TableUpdateRequest = {};
  if (flags.description !== undefined) body.description = flags.description;
  if (flags.datasetLabel !== undefined) body.datasetLabel = flags.datasetLabel;
  if (flags.validFrom !== undefined) body.validFromField = flags.validFrom;
  if (flags.validTo !== undefined) body.validToField = flags.validTo;
  if (flags.schemaMapping !== undefined) {
    body.schemaMapping = flags.schemaMapping;
  }
  if (Object.keys(body).length === 0) {
    throw new Error(
      "Nothing to update. Pass at least one of --description, --dataset-label, --valid-from, --valid-to, --schema-mapping.",
    );
  }
  return body;
}
