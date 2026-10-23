/**
 * Hand-written types for the /v1/source-datasets REST API.
 *
 * The API is still x-internal, so codegen (REMOVE_X_INTERNAL against the
 * public spec) does not emit it. These mirror the spec's
 * SourceDataset-CreateRequest, SourceDataset-UpdateRequest and
 * SourceDataset-Resource. Replace them with the generated types once the API
 * is public, and do not import a locally generated SourceDatasetApi before
 * then: CI generates from the public spec and would not have it.
 */

export type SourceDatasetStorage = "Native" | "Iceberg";

export type SourceDatasetSchemaType =
  | "Any"
  | "OtelLogs"
  | "OtelMetrics"
  | "Prometheus"
  | "K8sEntity"
  | "OtelSpan";

export type SourceDatasetIngestStatus =
  | "Receiving"
  | "NoDataYet"
  | "Error"
  | "Disabled";

export type ObjectTags = Record<string, string[]>;

export interface SourceDatasetCreateRequest {
  label: string;
  description?: string | null;
  icon?: string | null;
  objectTags?: ObjectTags;
  dataRetentionDays?: number | null;
  dataSource?: {
    kind?: "Ingest";
    ingest?: {
      storage?: SourceDatasetStorage;
      schemaType?: SourceDatasetSchemaType;
      iceberg?: { storageIntegrationId?: string } | null;
    };
  };
}

/** JSON Merge Patch body: omitted fields are unchanged, `null` clears. */
export interface SourceDatasetUpdateRequest {
  label?: string;
  description?: string | null;
  icon?: string | null;
  objectTags?: ObjectTags;
  dataRetentionDays?: number | null;
}

export interface SourceDatasetUserRef {
  id: string;
  label?: string;
}

export interface SourceDatasetResource {
  id: string;
  label: string;
  isSource: boolean;
  description: string | null;
  icon: string | null;
  objectTags: ObjectTags;
  contentType: string;
  fieldList: { name: string; type: { tag: string } }[];
  dataSource: {
    kind: "Ingest";
    ingest: {
      storage: SourceDatasetStorage;
      schemaType: SourceDatasetSchemaType;
      iceberg?: { storageIntegration?: { id: string } } | null;
      metadataDataset: { id: string } | null;
    } | null;
    shareIn: null;
  };
  dataRetentionDays: number | null;
  effectiveDataRetentionDays: number;
  accelerationType: string;
  accelerationState: string;
  correlationTags: unknown[];
  ingestStatus: SourceDatasetIngestStatus;
  ingestStats?: {
    /** Per-minute series over the last hour. */
    observations: { time: string; value: number }[];
    volumeBytes: { time: string; value: number }[];
    observationsLastHour: number | null;
    bytesLastHour: number | null;
    firstIngest: string | null;
    lastIngest: string | null;
  } | null;
  createdBy: SourceDatasetUserRef;
  updatedBy: SourceDatasetUserRef;
  createdAt: string;
  updatedAt: string;
}

export interface SourceDatasetListResponse {
  sourceDatasets: SourceDatasetResource[];
  meta: { totalCount: number };
}
