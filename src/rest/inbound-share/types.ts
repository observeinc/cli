/**
 * Hand-written types for the /v1/shares/inbound REST API.
 *
 * The API is still x-internal, so codegen (REMOVE_X_INTERNAL against the
 * public spec) does not emit it. These mirror the spec's ExternalShares-*
 * schemas. Replace them with the generated types once the API is public, and
 * do not import a locally generated ExternalSharesApi before then: CI
 * generates from the public spec and would not have it.
 */

export type ShareState = "Creating" | "Active" | "Deleting" | "Unknown";

export type HealthStatus = "Healthy" | "Unhealthy" | "Unknown";

export type TableStatus = "Active" | "Unknown";

export type TableKind = "Table" | "View" | "Unknown";

export type CdcStatus = "Enabled" | "Disabled" | "Error" | "Unknown";

export type DatasetKind = "Table" | "Event" | "Interval";

export type FieldConversion =
  | "Direct"
  | "MillisecondsToTimestamp"
  | "SecondsToTimestamp"
  | "MicrosecondsToTimestamp"
  | "NanosecondsToTimestamp"
  | "Drop";

export type SchemaMapping = Record<
  string,
  { type: string; conversion: FieldConversion }
>;

export interface UserRef {
  id: string;
  label?: string;
}

/** `sql` may contain <angle-bracket> placeholders the customer fills in. */
export interface SetupSqlStep {
  description: string;
  sql: string;
}

export interface SetupGuidance {
  summary: string;
  setupSql: SetupSqlStep[];
  providerChecks: SetupSqlStep[];
  checklist: string[];
}

export interface SetupInfo {
  consumerAccount: string;
  region: string;
  cloud: string | null;
  guidance: SetupGuidance;
}

export interface RegistrationToken {
  token: string;
  expiresAt: string;
  /** Carries the token: the ALTER SHARE ... SET COMMENT statement. */
  setupSql: SetupSqlStep[];
}

export interface ShareStatus {
  state: ShareState;
  health: HealthStatus;
  healthMessage?: string | null;
  lastHealthCheckAt?: string | null;
}

export interface ShareListItem {
  id: string;
  shareName: string;
  label: string;
  providerType: "Snowflake";
  providerAccount: string;
  status: ShareStatus;
  createdBy: UserRef;
  createdAt: string;
  updatedBy: UserRef;
  updatedAt: string;
  tableCount: number;
}

export interface ShareResource extends ShareListItem {
  snowflakeConfig: { shareName: string; providerAccount: string };
}

export interface ShareListResponse {
  shares: ShareListItem[];
  meta: { totalCount: number };
}

export interface RegisterShareRequest {
  providerAccount: string;
  shareName: string;
}

export interface UpdateShareRequest {
  label: string;
}

export interface TableResource {
  id: string;
  share: {
    id: string;
    record?: { shareName: string; label: string; providerAccount: string };
  };
  fullTablePath: string;
  tableName: string;
  schemaName: string;
  tableType: TableKind;
  status: TableStatus;
  health: HealthStatus;
  cdcStatus: CdcStatus;
  sourceDataset?: {
    id: string;
    record?: {
      label: string;
      description: string;
      iconUrl: string;
      contentType: string;
    };
  } | null;
  tableSchema?: {
    columns: { name: string; type: string; nullable: boolean }[];
  } | null;
  createdBy: UserRef | null;
  createdAt: string;
  updatedBy: UserRef | null;
  updatedAt: string;
}

export interface TableListResponse {
  tables: TableResource[];
  meta: { totalCount: number };
}

/** A table in the share that is not tracked yet. */
export interface UntrackedTable {
  schemaName: string;
  tableName: string;
  tableType: string;
}

export interface UntrackedTableListResponse {
  tables: UntrackedTable[];
  meta: { totalCount: number };
}

export interface TrackTableRequest {
  tableName: string;
  schemaName: string;
  datasetLabel: string;
  datasetKind: DatasetKind;
  description?: string;
  validFromField?: string | null;
  validToField?: string | null;
  schemaMapping?: SchemaMapping | null;
}

/** Omitted fields are unchanged. */
export interface TableUpdateRequest {
  description?: string;
  datasetLabel?: string;
  validFromField?: string;
  validToField?: string;
  schemaMapping?: SchemaMapping;
}
