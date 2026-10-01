/* tslint:disable */
/* eslint-disable */
/**
 * Statistics about notification actions taken for this alert
 * @export
 * @interface AlertActionStats
 */
export interface AlertActionStats {
    /**
     * 
     * @type {string}
     * @memberof AlertActionStats
     */
    numNotifsDiscarded: string;
    /**
     * 
     * @type {string}
     * @memberof AlertActionStats
     */
    numNotifsMuted: string;
    /**
     * When the alert was last muted. Null if never muted.
     * @type {string}
     * @memberof AlertActionStats
     */
    lastMutedAt: string | null;
    /**
     * 
     * @type {string}
     * @memberof AlertActionStats
     */
    numNotifsSent: string;
    /**
     * When a notification was last sent. Null if never sent.
     * @type {string}
     * @memberof AlertActionStats
     */
    lastSentAt: string | null;
    /**
     * 
     * @type {string}
     * @memberof AlertActionStats
     */
    numErrors: string;
    /**
     * When the last notification error occurred. Null if no errors.
     * @type {string}
     * @memberof AlertActionStats
     */
    lastErroredAt: string | null;
}
/**
 * 
 * @export
 * @interface AlertAutomaticInvestigation
 */
export interface AlertAutomaticInvestigation {
    /**
     * 
     * @type {AlertAutomaticInvestigationOutcome}
     * @memberof AlertAutomaticInvestigation
     */
    outcome: AlertAutomaticInvestigationOutcome;
    /**
     * 
     * @type {ChatRef}
     * @memberof AlertAutomaticInvestigation
     */
    chat: ChatRef | null;
}


/**
 * Current state or terminal result of an automatic AI investigation attempt.
 * @export
 * @enum {string}
 */
export enum AlertAutomaticInvestigationOutcome {
    Started = 'Started',
    Completed = 'Completed',
    RateLimitedPerMonitor = 'RateLimitedPerMonitor',
    RateLimitedPerCustomer = 'RateLimitedPerCustomer',
    SkippedAlertMuted = 'SkippedAlertMuted',
    SkippedAlertLevelNotSelected = 'SkippedAlertLevelNotSelected',
    FailedNoValidUser = 'FailedNoValidUser',
    FailedInternalError = 'FailedInternalError'
}

/**
 * A value captured at the time the alert was triggered
 * @export
 * @interface AlertCapturedValue
 */
export interface AlertCapturedValue {
    /**
     * 
     * @type {Array<AlertCapturedValueType>}
     * @memberof AlertCapturedValue
     */
    types: Array<AlertCapturedValueType>;
    /**
     * 
     * @type {AlertColumn}
     * @memberof AlertCapturedValue
     */
    column: AlertColumn;
    /**
     * The captured cell value. Null when the cell had no value.
     * @type {string}
     * @memberof AlertCapturedValue
     */
    value: string | null;
}
/**
 * 
 * @export
 * @enum {string}
 */
export enum AlertCapturedValueType {
    Aggregation = 'Aggregation',
    GroupBy = 'GroupBy',
    LinkSourceField = 'LinkSourceField'
}

/**
 * A column reference, either a direct column path, a link column, or a
 * correlation tag. Exactly one of `linkColumn`, `columnPath`, or
 * `correlationTag` is non-null.
 * 
 * @export
 * @interface AlertColumn
 */
export interface AlertColumn {
    /**
     * 
     * @type {AlertLinkColumn}
     * @memberof AlertColumn
     */
    linkColumn: AlertLinkColumn | null;
    /**
     * 
     * @type {AlertColumnPath}
     * @memberof AlertColumn
     */
    columnPath: AlertColumnPath | null;
    /**
     * 
     * @type {AlertCorrelationTag}
     * @memberof AlertColumn
     */
    correlationTag: AlertCorrelationTag | null;
}
/**
 * 
 * @export
 * @interface AlertColumnPath
 */
export interface AlertColumnPath {
    /**
     * The column's identifier within its dataset. This is the programmatic
     * name used to look up the column, not a display label.
     * 
     * @type {string}
     * @memberof AlertColumnPath
     */
    name: string;
    /**
     * Optional dotted path into a nested column. Null when absent.
     * @type {string}
     * @memberof AlertColumnPath
     */
    path: string | null;
}
/**
 * A context entry representing a grouping value for which the alert triggered
 * @export
 * @interface AlertContextEntry
 */
export interface AlertContextEntry {
    /**
     * 
     * @type {AlertColumn}
     * @memberof AlertContextEntry
     */
    column: AlertColumn;
    /**
     * 
     * @type {string}
     * @memberof AlertContextEntry
     */
    value: string;
}
/**
 * A correlation tag reference. The tag identifier is the canonical
 * name; the resolved backing column(s) are server-side details and
 * not part of the wire shape.
 * 
 * @export
 * @interface AlertCorrelationTag
 */
export interface AlertCorrelationTag {
    /**
     * Canonical correlation tag identifier.
     * @type {string}
     * @memberof AlertCorrelationTag
     */
    tag: string;
}
/**
 * A single facet value and its alert count.
 * @export
 * @interface AlertFacetEntry
 */
export interface AlertFacetEntry {
    /**
     * The facet value used for filtering (e.g. "Active", "Critical", a
     * monitor ID, or "true"/"false" for boolean facets).
     * 
     * @type {string}
     * @memberof AlertFacetEntry
     */
    key: string;
    /**
     * Human-readable display label. For most facets this equals key.
     * For monitors, this is the monitor label while key is the monitor ID.
     * Null when no label is needed (i.e. it would equal key).
     * 
     * @type {string}
     * @memberof AlertFacetEntry
     */
    label: string | null;
    /**
     * Number of alerts matching this facet value.
     * @type {string}
     * @memberof AlertFacetEntry
     */
    count: string;
}
/**
 * Faceted counts of all alerts in the requested time window, grouped by
 * key attributes. Computed independently of any filter or pagination
 * parameters.
 * 
 * @export
 * @interface AlertFacets
 */
export interface AlertFacets {
    /**
     * Count of alerts grouped by status (Active, Ended, Retracted).
     * @type {Array<AlertFacetEntry>}
     * @memberof AlertFacets
     */
    byStatus: Array<AlertFacetEntry>;
    /**
     * Count of alerts grouped by severity level.
     * @type {Array<AlertFacetEntry>}
     * @memberof AlertFacets
     */
    byLevel: Array<AlertFacetEntry>;
    /**
     * Count of alerts grouped by monitor, ordered by count descending.
     * @type {Array<AlertFacetEntry>}
     * @memberof AlertFacets
     */
    byMonitor: Array<AlertFacetEntry>;
    /**
     * Count of alerts grouped by mute status.
     * @type {Array<AlertFacetEntry>}
     * @memberof AlertFacets
     */
    byMuted: Array<AlertFacetEntry>;
    /**
     * Count of alerts with vs without an AI investigation. Omitted when that feature is not enabled.
     * @type {Array<AlertFacetEntry>}
     * @memberof AlertFacets
     */
    byHasAiChat?: Array<AlertFacetEntry>;
}
/**
 * Severity level of the alert
 * @export
 * @enum {string}
 */
export enum AlertLevel {
    Critical = 'Critical',
    Error = 'Error',
    Warning = 'Warning',
    Informational = 'Informational',
    NoData = 'NoData',
    None = 'None'
}

/**
 * 
 * @export
 * @interface AlertLinkColumn
 */
export interface AlertLinkColumn {
    /**
     * The link column's identifier. This is the programmatic name used to
     * look up the column, not a display label.
     * 
     * @type {string}
     * @memberof AlertLinkColumn
     */
    name: string;
    /**
     * 
     * @type {AlertLinkColumnMeta}
     * @memberof AlertLinkColumn
     */
    meta: AlertLinkColumnMeta | null;
}
/**
 * 
 * @export
 * @interface AlertLinkColumnMeta
 */
export interface AlertLinkColumnMeta {
    /**
     * 
     * @type {Array<AlertColumnPath>}
     * @memberof AlertLinkColumnMeta
     */
    srcFields: Array<AlertColumnPath> | null;
    /**
     * 
     * @type {Array<string>}
     * @memberof AlertLinkColumnMeta
     */
    dstFields: Array<string> | null;
    /**
     * 
     * @type {ObjectRef}
     * @memberof AlertLinkColumnMeta
     */
    targetDataset: ObjectRef | null;
}
/**
 * 
 * @export
 * @interface AlertListResponse
 */
export interface AlertListResponse {
    /**
     * 
     * @type {Array<AlertResource>}
     * @memberof AlertListResponse
     */
    alerts: Array<AlertResource>;
    /**
     * 
     * @type {Meta}
     * @memberof AlertListResponse
     */
    meta: Meta;
    /**
     * Faceted counts for key alert attributes across all alerts in the time
     * window. Independent of filter and pagination. Only included when
     * includeFacets=true.
     * 
     * @type {AlertFacets}
     * @memberof AlertListResponse
     */
    facets?: AlertFacets;
}
/**
 * Service-binding triplet for an alert. Present whenever the alert's
 * monitor has a service binding declared; a dimension that does not
 * resolve to a value is an empty string. Omitted only when the
 * monitor has no service binding declared.
 * 
 * @export
 * @interface AlertResolvedServiceBinding
 */
export interface AlertResolvedServiceBinding {
    /**
     * Value of the `service.name` correlation tag.
     * @type {string}
     * @memberof AlertResolvedServiceBinding
     */
    serviceName: string;
    /**
     * Value of the `deployment.environment.name` correlation tag.
     * @type {string}
     * @memberof AlertResolvedServiceBinding
     */
    environment: string;
    /**
     * Value of the `service.namespace` correlation tag.
     * @type {string}
     * @memberof AlertResolvedServiceBinding
     */
    serviceNamespace: string;
}
/**
 * A monitor alert representing a detected condition.
 * @export
 * @interface AlertResource
 */
export interface AlertResource {
    /**
     * Unique identifier for the alert
     * @type {string}
     * @memberof AlertResource
     */
    id: string;
    /**
     * When the alert condition first occurred
     * @type {string}
     * @memberof AlertResource
     */
    start: string;
    /**
     * When the alert condition ended. Null for active alerts.
     * @type {string}
     * @memberof AlertResource
     */
    end: string | null;
    /**
     * When the alert start was detected by the monitoring system. Null when not yet detected.
     * @type {string}
     * @memberof AlertResource
     */
    detectedStart: string | null;
    /**
     * When the alert end was detected by the monitoring system. Null for active alerts.
     * @type {string}
     * @memberof AlertResource
     */
    detectedEnd: string | null;
    /**
     * 
     * @type {AlertStatus}
     * @memberof AlertResource
     */
    status: AlertStatus;
    /**
     * 
     * @type {AlertLevel}
     * @memberof AlertResource
     */
    level: AlertLevel;
    /**
     * Hash of the grouping values for this alert
     * @type {string}
     * @memberof AlertResource
     */
    groupingHash: string;
    /**
     * 
     * @type {Array<AlertCapturedValue>}
     * @memberof AlertResource
     */
    capturedValues: Array<AlertCapturedValue>;
    /**
     * 
     * @type {Array<AlertContextEntry>}
     * @memberof AlertResource
     */
    context: Array<AlertContextEntry>;
    /**
     * Version of the monitor when this alert was created
     * @type {string}
     * @memberof AlertResource
     */
    monitorVersion: string;
    /**
     * Reference to the monitor that generated this alert. Always carries
     * the id; the `record` field is populated only when expand=true.
     * 
     * @type {MonitorRef}
     * @memberof AlertResource
     */
    monitor: MonitorRef;
    /**
     * Whether the alert is currently muted by active mute rules.
     * @type {boolean}
     * @memberof AlertResource
     */
    muted: boolean;
    /**
     * Optional field tied to a feature under development. Where that
     * feature is not enabled the key is omitted from the response
     * entirely, rather than returned as an empty array; it becomes
     * required once the feature is generally available.
     * 
     * AI investigations for this alert, newest first; empty when it has
     * never been investigated. An investigation is started either
     * automatically, when the alert's monitor has AI triaging enabled, or
     * by a user from the alert.
     * 
     * @type {Array<ChatResource>}
     * @memberof AlertResource
     */
    aiChats?: Array<ChatResource>;
    /**
     * 
     * @type {AlertAutomaticInvestigation}
     * @memberof AlertResource
     */
    automaticInvestigation?: AlertAutomaticInvestigation | null;
    /**
     * 
     * @type {AlertResolvedServiceBinding}
     * @memberof AlertResource
     */
    resolvedServiceBinding?: AlertResolvedServiceBinding | null;
    /**
     * Action statistics for this alert. Only included when expand=true.
     * @type {AlertActionStats}
     * @memberof AlertResource
     */
    stats?: AlertActionStats;
}


/**
 * Current status of the alert
 * @export
 * @enum {string}
 */
export enum AlertStatus {
    Active = 'Active',
    Ended = 'Ended',
    Retracted = 'Retracted'
}

/**
 * 
 * @export
 * @interface Annotation
 */
export interface Annotation {
    /**
     * 
     * @type {AnnotationType}
     * @memberof Annotation
     */
    type: AnnotationType;
    /**
     * Populated when `type` is `point`; absent otherwise.
     * @type {PointAnnotation}
     * @memberof Annotation
     */
    point?: PointAnnotation;
    /**
     * Populated when `type` is `range`; absent otherwise.
     * @type {RangeAnnotation}
     * @memberof Annotation
     */
    range?: RangeAnnotation;
}


/**
 * 
 * @export
 * @enum {string}
 */
export enum AnnotationType {
    Point = 'point',
    Range = 'range'
}

/**
 * Settings for the anomaly chart: which column marks anomalous
 * points, which one separates the series, and how the two axes
 * are drawn.
 * 
 * This chart type is read-only. The product has no editor for
 * it, and only the monitor view produces one. Preserve these
 * settings when updating a dashboard that already has one, but
 * do not author them.
 * 
 * @export
 * @interface AnomalyOptions
 */
export interface AnomalyOptions {
    /**
     * 
     * @type {FieldRef}
     * @memberof AnomalyOptions
     */
    redPointField?: FieldRef;
    /**
     * 
     * @type {FieldRef}
     * @memberof AnomalyOptions
     */
    seriesField?: FieldRef;
    /**
     * 
     * @type {AxisConfig}
     * @memberof AnomalyOptions
     */
    xConfig?: AxisConfig;
    /**
     * 
     * @type {AxisConfig}
     * @memberof AnomalyOptions
     */
    yConfig?: AxisConfig;
    /**
     * 
     * @type {LineCurveType}
     * @memberof AnomalyOptions
     */
    curve?: LineCurveType;
    /**
     * An escape hatch for visualization settings that do not yet have
     * a typed field of their own. Contents are stored and returned
     * unchanged and are not validated, so newer clients can round-trip
     * settings this version of the schema does not name.
     * 
     * @type {{ [key: string]: any | undefined; }}
     * @memberof AnomalyOptions
     */
    extensions?: { [key: string]: any | undefined; };
}


/**
 * 
 * @export
 * @interface ApiTokenCreateRequest
 */
export interface ApiTokenCreateRequest {
    /**
     * 
     * @type {string}
     * @memberof ApiTokenCreateRequest
     */
    label: string;
    /**
     * 
     * @type {string}
     * @memberof ApiTokenCreateRequest
     */
    description?: string;
    /**
     * 
     * @type {number}
     * @memberof ApiTokenCreateRequest
     */
    lifetimeHours: number;
    /**
     * Optionally constrains the token's effective permissions. An empty/omitted list leaves the token unscoped. Unknown scopes are rejected.
     * @type {Array<ApiTokenScope>}
     * @memberof ApiTokenCreateRequest
     */
    scopes?: Array<ApiTokenScope>;
}
/**
 * 
 * @export
 * @interface ApiTokenListResponse
 */
export interface ApiTokenListResponse {
    /**
     * 
     * @type {Array<ApiTokenResource>}
     * @memberof ApiTokenListResponse
     */
    apiTokens: Array<ApiTokenResource>;
    /**
     * 
     * @type {Meta}
     * @memberof ApiTokenListResponse
     */
    meta: Meta;
}
/**
 * 
 * @export
 * @interface ApiTokenResource
 */
export interface ApiTokenResource {
    /**
     * 
     * @type {string}
     * @memberof ApiTokenResource
     */
    id: string;
    /**
     * 
     * @type {string}
     * @memberof ApiTokenResource
     */
    label: string;
    /**
     * 
     * @type {string}
     * @memberof ApiTokenResource
     */
    description: string;
    /**
     * 
     * @type {string}
     * @memberof ApiTokenResource
     */
    expiration: string;
    /**
     * 
     * @type {User}
     * @memberof ApiTokenResource
     */
    createdBy: User;
    /**
     * 
     * @type {string}
     * @memberof ApiTokenResource
     */
    createdAt: string;
    /**
     * 
     * @type {User}
     * @memberof ApiTokenResource
     */
    updatedBy: User;
    /**
     * 
     * @type {string}
     * @memberof ApiTokenResource
     */
    updatedAt: string;
    /**
     * 
     * @type {boolean}
     * @memberof ApiTokenResource
     */
    disabled: boolean;
    /**
     * The token's effective scopes. An empty/omitted list means the token is unscoped.
     * @type {Array<ApiTokenScope>}
     * @memberof ApiTokenResource
     */
    scopes?: Array<ApiTokenScope>;
    /**
     * The secret for the API token. Only returned on create.
     * @type {string}
     * @memberof ApiTokenResource
     */
    secret?: string;
}
/**
 * 
 * @export
 * @enum {string}
 */
export enum ApiTokenScope {
    ApiRead = 'api:read',
    ApiWrite = 'api:write',
    Unscoped = 'unscoped'
}

/**
 * 
 * @export
 * @interface ApiTokenUpdateRequest
 */
export interface ApiTokenUpdateRequest {
    /**
     * 
     * @type {string}
     * @memberof ApiTokenUpdateRequest
     */
    label?: string;
    /**
     * 
     * @type {string}
     * @memberof ApiTokenUpdateRequest
     */
    description?: string;
    /**
     * 
     * @type {number}
     * @memberof ApiTokenUpdateRequest
     */
    lifetimeHours?: number;
    /**
     * 
     * @type {boolean}
     * @memberof ApiTokenUpdateRequest
     */
    disabled?: boolean;
}
/**
 * One environment + the service namespaces observed in it.
 * @export
 * @interface ApmEnvironmentEntry
 */
export interface ApmEnvironmentEntry {
    /**
     * 
     * @type {string}
     * @memberof ApmEnvironmentEntry
     */
    environment: string;
    /**
     * 
     * @type {Array<string>}
     * @memberof ApmEnvironmentEntry
     */
    serviceNamespaces: Array<string>;
    /**
     * True when serviceNamespaces was capped at the server limit and the
     * full set for this environment is larger than the array returned.
     * serviceNamespaces is never paged; this flag signals truncation.
     * 
     * @type {boolean}
     * @memberof ApmEnvironmentEntry
     */
    truncated: boolean;
}
/**
 * Response envelope for GET /v1/apm/environments. `interval` echoes the
 * server-resolved query window. Pagination is on the environments axis
 * — `serviceNamespaces` is the complete list per environment, never paged.
 * 
 * @export
 * @interface ApmEnvironmentsListResponse
 */
export interface ApmEnvironmentsListResponse {
    /**
     * 
     * @type {ApmInterval}
     * @memberof ApmEnvironmentsListResponse
     */
    interval: ApmInterval;
    /**
     * 
     * @type {Array<ApmEnvironmentEntry>}
     * @memberof ApmEnvironmentsListResponse
     */
    environments: Array<ApmEnvironmentEntry>;
    /**
     * 
     * @type {ApmMeta}
     * @memberof ApmEnvironmentsListResponse
     */
    meta: ApmMeta;
}
/**
 * APM error envelope. Extends the platform error (type + message) with a
 * closed `type` enum (see Apm-ErrorType). On OutOfAcceleratedRange,
 * acceleratedFrom is the recovery timestamp.
 * 
 * @export
 * @interface ApmError
 */
export interface ApmError {
    /**
     * 
     * @type {ApmErrorType}
     * @memberof ApmError
     */
    type: ApmErrorType;
    /**
     * Error message
     * @type {string}
     * @memberof ApmError
     */
    message: string;
    /**
     * Earliest moment for which telemetry is available on this account.
     * Present only on type=OutOfAcceleratedRange.
     * 
     * @type {string}
     * @memberof ApmError
     */
    acceleratedFrom?: string;
}


/**
 * Stable, machine-readable APM error category.
 * 
 * - `BadRequest`: the request is malformed or otherwise the caller's
 *   doing (inverted time window, canceled request, invalid filter).
 * - `RequiredParamMissing`: a required parameter was omitted or passed
 *   empty.
 * - `InvalidTimestamp`: a time bound is not a valid RFC3339 timestamp.
 * - `OutOfAcceleratedRange`: the requested window starts before this
 *   account's accelerated telemetry is available. `acceleratedFrom` is
 *   the earliest recoverable timestamp.
 * - `NotConfigured`: an account/config state, not a malformed request
 *   and not a server fault. The tracing-content dataset an APM read
 *   needs has not been installed (or has not yet been discovered) for
 *   this account. Retrying will not help until that dataset exists.
 * - `PayloadTooLarge`: the result exceeds a server-enforced size cap
 *   (for example the invocation graph's edge limit). Narrow the window
 *   or supply a focal identity.
 * - `TimedOut`: the query exceeded its time budget.
 * - `InternalError`: an unexpected server failure.
 * 
 * @export
 * @enum {string}
 */
export enum ApmErrorType {
    BadRequest = 'BadRequest',
    RequiredParamMissing = 'RequiredParamMissing',
    InvalidTimestamp = 'InvalidTimestamp',
    OutOfAcceleratedRange = 'OutOfAcceleratedRange',
    NotConfigured = 'NotConfigured',
    PayloadTooLarge = 'PayloadTooLarge',
    TimedOut = 'TimedOut',
    InternalError = 'InternalError'
}

/**
 * A `[startTime, endTime)` half-open window. Used both as the per-record
 * time slice on `MetricsRecord` and as the response-level executed-window
 * echo. RFC3339, startTime inclusive, endTime exclusive.
 * 
 * @export
 * @interface ApmInterval
 */
export interface ApmInterval {
    /**
     * 
     * @type {string}
     * @memberof ApmInterval
     */
    startTime: string;
    /**
     * 
     * @type {string}
     * @memberof ApmInterval
     */
    endTime: string;
}
/**
 * The service dependency graph for the requested scope. `interval` echoes
 * the resolved query window, `services` lists every service in the graph,
 * and `invocations` lists the calls between them. A service that is never
 * the `target` of a call is a root.
 * 
 * @export
 * @interface ApmInvocationGraphResponse
 */
export interface ApmInvocationGraphResponse {
    /**
     * 
     * @type {ApmInterval}
     * @memberof ApmInvocationGraphResponse
     */
    interval: ApmInterval;
    /**
     * 
     * @type {Array<ApmService>}
     * @memberof ApmInvocationGraphResponse
     */
    services: Array<ApmService>;
    /**
     * 
     * @type {Array<ApmServiceInvocation>}
     * @memberof ApmInvocationGraphResponse
     */
    invocations: Array<ApmServiceInvocation>;
}
/**
 * Source or target end of a ServiceInvocation edge. endpointName is
 * populated only in focal-endpoint mode of /v1/apm/invocation-graph.
 * 
 * @export
 * @interface ApmInvocationParticipant
 */
export interface ApmInvocationParticipant {
    /**
     * 
     * @type {string}
     * @memberof ApmInvocationParticipant
     */
    serviceName: string;
    /**
     * 
     * @type {string}
     * @memberof ApmInvocationParticipant
     */
    environment: string;
    /**
     * 
     * @type {string}
     * @memberof ApmInvocationParticipant
     */
    serviceNamespace: string | null;
    /**
     * 
     * @type {ApmServiceType}
     * @memberof ApmInvocationParticipant
     */
    type: ApmServiceType | null;
    /**
     * 
     * @type {string}
     * @memberof ApmInvocationParticipant
     */
    language: string | null;
    /**
     * 
     * @type {string}
     * @memberof ApmInvocationParticipant
     */
    endpointName?: string | null;
}


/**
 * APM list-response meta. Extends platform Meta (totalCount only) with
 * limit and offset echoed from the request. A totalCount of -1 means the
 * exact count is unknown (too expensive to compute); in that case paginate
 * by advancing offset until a short page (len(items) < limit) is returned.
 * 
 * @export
 * @interface ApmMeta
 */
export interface ApmMeta {
    /**
     * 
     * @type {number}
     * @memberof ApmMeta
     */
    totalCount: number;
    /**
     * 
     * @type {number}
     * @memberof ApmMeta
     */
    limit: number;
    /**
     * 
     * @type {number}
     * @memberof ApmMeta
     */
    offset: number;
}
/**
 * One queryable metric on Service.related.metrics. Names are the RED
 * metrics used for this row (call count, error count, duration). Every
 * entry shares the same `attributeMapping` as `related.correlationTags`.
 * Pick the `serviceName` dimension from `Service.type`: `Service` →
 * `service.name`, `Database` → `peer.db.name`, `Messaging` →
 * `peer.messaging.system`, `ExternalCall` → `peer.server.address`.
 * Precedence is `Service` > `Database` > `Messaging` > `ExternalCall`.
 * When `type` is null, use `service.name`.
 * 
 * @export
 * @interface ApmMetricRef
 */
export interface ApmMetricRef {
    /**
     * 
     * @type {string}
     * @memberof ApmMetricRef
     */
    metricName: string;
    /**
     * 
     * @type {DatasetRef}
     * @memberof ApmMetricRef
     */
    dataset: DatasetRef;
    /**
     * 
     * @type {{ [key: string]: Array<string> | undefined; }}
     * @memberof ApmMetricRef
     */
    attributeMapping: { [key: string]: Array<string> | undefined; };
}
/**
 * Closed RED carrier: invocationRatePerSecond, errorRatePerSecond,
 * durationP95Seconds. `series[]` is opt-in via expand=true on
 * /v1/apm/services only.
 * 
 * @export
 * @interface ApmMetricsRecord
 */
export interface ApmMetricsRecord {
    /**
     * 
     * @type {ApmInterval}
     * @memberof ApmMetricsRecord
     */
    interval: ApmInterval;
    /**
     * 
     * @type {number}
     * @memberof ApmMetricsRecord
     */
    invocationRatePerSecond: number | null;
    /**
     * 
     * @type {number}
     * @memberof ApmMetricsRecord
     */
    errorRatePerSecond: number | null;
    /**
     * 
     * @type {number}
     * @memberof ApmMetricsRecord
     */
    durationP95Seconds: number | null;
    /**
     * Per-bucket points over the same interval. Populated only when the
     * endpoint documents an expand=true opt-in (see /v1/apm/services).
     * Absent on every other endpoint.
     * 
     * @type {Array<ApmMetricsRecordPoint>}
     * @memberof ApmMetricsRecord
     */
    series?: Array<ApmMetricsRecordPoint>;
}
/**
 * One bucket inside MetricsRecord.series. timestamp = bucket start.
 * @export
 * @interface ApmMetricsRecordPoint
 */
export interface ApmMetricsRecordPoint {
    /**
     * 
     * @type {string}
     * @memberof ApmMetricsRecordPoint
     */
    timestamp: string;
    /**
     * 
     * @type {number}
     * @memberof ApmMetricsRecordPoint
     */
    invocationRatePerSecond: number | null;
    /**
     * 
     * @type {number}
     * @memberof ApmMetricsRecordPoint
     */
    errorRatePerSecond: number | null;
    /**
     * 
     * @type {number}
     * @memberof ApmMetricsRecordPoint
     */
    durationP95Seconds: number | null;
}
/**
 * Service identity (OTel compound key) + RED snapshot under redMetrics +
 * per-row related hints. ServiceInvocation uses `metrics` (not
 * `redMetrics`) for the same MetricsRecord type — intentional asymmetry.
 * 
 * @export
 * @interface ApmService
 */
export interface ApmService {
    /**
     * 
     * @type {string}
     * @memberof ApmService
     */
    serviceName: string;
    /**
     * 
     * @type {string}
     * @memberof ApmService
     */
    environment: string;
    /**
     * 
     * @type {string}
     * @memberof ApmService
     */
    serviceNamespace: string | null;
    /**
     * 
     * @type {ApmServiceType}
     * @memberof ApmService
     */
    type: ApmServiceType | null;
    /**
     * 
     * @type {string}
     * @memberof ApmService
     */
    language: string | null;
    /**
     * 
     * @type {ApmMetricsRecord}
     * @memberof ApmService
     */
    redMetrics: ApmMetricsRecord;
    /**
     * 
     * @type {ApmServiceRelated}
     * @memberof ApmService
     */
    related: ApmServiceRelated;
}


/**
 * Directed call edge from source to target. Both are always non-null —
 * roots are services with no inbound edge in invocations[], not edges
 * with null source. Carrier field is `metrics` (not `redMetrics`).
 * 
 * @export
 * @interface ApmServiceInvocation
 */
export interface ApmServiceInvocation {
    /**
     * 
     * @type {ApmInvocationParticipant}
     * @memberof ApmServiceInvocation
     */
    source: ApmInvocationParticipant;
    /**
     * 
     * @type {ApmInvocationParticipant}
     * @memberof ApmServiceInvocation
     */
    target: ApmInvocationParticipant;
    /**
     * 
     * @type {ApmMetricsRecord}
     * @memberof ApmServiceInvocation
     */
    metrics: ApmMetricsRecord;
}
/**
 * Per-row correlation hints on Service. Always present; `metrics` may be
 * `[]`. `correlationTags` maps Service fields to the attribute keys to
 * filter with:
 * 
 * - `serviceName`: `service.name`, `peer.db.name`, `peer.messaging.system`,
 *   `peer.server.address`
 * - `environment`: `deployment.environment.name`
 * - `serviceNamespace`: `service.namespace`
 * 
 * These are attribute keys, not dataset column names. Use `Service.type`
 * to pick the `serviceName` key to filter on: `Service` →
 * `service.name`, `Database` → `peer.db.name`, `Messaging` →
 * `peer.messaging.system`, `ExternalCall` → `peer.server.address`.
 * Precedence is `Service` > `Database` > `Messaging` > `ExternalCall`.
 * When `type` is null, use `service.name`. `environment` and
 * `serviceNamespace` apply to every type.
 * 
 * @export
 * @interface ApmServiceRelated
 */
export interface ApmServiceRelated {
    /**
     * Service field name → attribute keys to filter with. v1 always
     * returns the three keys above. Pick `serviceName` by `Service.type`
     * (see parent description).
     * 
     * @type {{ [key: string]: Array<string> | undefined; }}
     * @memberof ApmServiceRelated
     */
    correlationTags: { [key: string]: Array<string> | undefined; };
    /**
     * 
     * @type {Array<ApmMetricRef>}
     * @memberof ApmServiceRelated
     */
    metrics: Array<ApmMetricRef>;
}
/**
 * Role of a service-keyed row. PascalCase per style guide. Selects which
 * `related.correlationTags.serviceName` key to filter on:
 * 
 * - `Service` → `service.name`
 * - `Database` → `peer.db.name`
 * - `Messaging` → `peer.messaging.system`
 * - `ExternalCall` → `peer.server.address` (uninstrumented hosts)
 * 
 * When more than one key is present, precedence is `Service` >
 * `Database` > `Messaging` > `ExternalCall`. When `type` is null (unknown
 * catalog type), use `service.name`.
 * 
 * @export
 * @enum {string}
 */
export enum ApmServiceType {
    Service = 'Service',
    Database = 'Database',
    Messaging = 'Messaging',
    ExternalCall = 'ExternalCall'
}

/**
 * Response envelope for GET /v1/apm/services. `interval` echoes the
 * server-resolved query window. `meta.totalCount` is `-1` when unknown.
 * 
 * @export
 * @interface ApmServicesListResponse
 */
export interface ApmServicesListResponse {
    /**
     * 
     * @type {ApmInterval}
     * @memberof ApmServicesListResponse
     */
    interval: ApmInterval;
    /**
     * 
     * @type {Array<ApmService>}
     * @memberof ApmServicesListResponse
     */
    services: Array<ApmService>;
    /**
     * 
     * @type {ApmMeta}
     * @memberof ApmServicesListResponse
     */
    meta: ApmMeta;
}
/**
 * Stacked-area chart options.
 * @export
 * @interface AreaOptions
 */
export interface AreaOptions {
    /**
     * 
     * @type {AxisConfig}
     * @memberof AreaOptions
     */
    xConfig?: AxisConfig;
    /**
     * 
     * @type {AxisConfig}
     * @memberof AreaOptions
     */
    yConfig?: AxisConfig;
    /**
     * 
     * @type {ColorConfig}
     * @memberof AreaOptions
     */
    colorConfig?: ColorConfig;
    /**
     * 
     * @type {LineConfig}
     * @memberof AreaOptions
     */
    areaConfig?: LineConfig;
    /**
     * 
     * @type {boolean}
     * @memberof AreaOptions
     */
    horizontal?: boolean;
    /**
     * 
     * @type {StackMode}
     * @memberof AreaOptions
     */
    stack?: StackMode;
    /**
     * An escape hatch for visualization settings that do not yet have
     * a typed field of their own. Contents are stored and returned
     * unchanged and are not validated, so newer clients can round-trip
     * settings this version of the schema does not name.
     * 
     * @type {{ [key: string]: any | undefined; }}
     * @memberof AreaOptions
     */
    extensions?: { [key: string]: any | undefined; };
}


/**
 * Aggregated statistics for one requested attribute expression: how many
 * distinct values it produced, plus the most frequent value/count pairs.
 * 
 * @export
 * @interface AttributeStats
 */
export interface AttributeStats {
    /**
     * The attribute expression that was queried, verbatim from the request.
     * @type {string}
     * @memberof AttributeStats
     */
    attribute: string;
    /**
     * Total distinct values, including those outside the returned top-K.
     * @type {number}
     * @memberof AttributeStats
     */
    distinctCount: number;
    /**
     * Top-K value/count pairs, sorted by count descending.
     * @type {Array<StatValueCount>}
     * @memberof AttributeStats
     */
    stats: Array<StatValueCount>;
}
/**
 * 
 * @export
 * @interface AxisBounds
 */
export interface AxisBounds {
    /**
     * 
     * @type {number}
     * @memberof AxisBounds
     */
    start?: number;
    /**
     * 
     * @type {number}
     * @memberof AxisBounds
     */
    end?: number;
}
/**
 * Configuration for a single axis: whether it is shown, its label,
 * bounds, scale, and number formatting. On a value axis
 * `valueFormat` uses all of `CellNumberFormat`; on category and
 * time axes only its `options` apply.
 * 
 * @export
 * @interface AxisConfig
 */
export interface AxisConfig {
    /**
     * 
     * @type {boolean}
     * @memberof AxisConfig
     */
    show?: boolean;
    /**
     * 
     * @type {string}
     * @memberof AxisConfig
     */
    label?: string;
    /**
     * 
     * @type {AxisConfigDomain}
     * @memberof AxisConfig
     */
    domain?: AxisConfigDomain;
    /**
     * 
     * @type {LogScale}
     * @memberof AxisConfig
     */
    scaleType?: LogScale;
    /**
     * 
     * @type {CellNumberFormat}
     * @memberof AxisConfig
     */
    valueFormat?: CellNumberFormat;
    /**
     * 
     * @type {boolean}
     * @memberof AxisConfig
     */
    hideGridLines?: boolean;
    /**
     * 
     * @type {AxisConfigOrient}
     * @memberof AxisConfig
     */
    orient?: AxisConfigOrient;
}


/**
 * 
 * @export
 * @interface AxisConfigDomain
 */
export interface AxisConfigDomain {
    /**
     * 
     * @type {AxisBounds}
     * @memberof AxisConfigDomain
     */
    range?: AxisBounds;
    /**
     * 
     * @type {AxisConfigDomainType}
     * @memberof AxisConfigDomain
     */
    type?: AxisConfigDomainType;
}


/**
 * 
 * @export
 * @enum {string}
 */
export enum AxisConfigDomainType {
    QueryWindow = 'Query Window',
    FitToData = 'Fit to Data'
}

/**
 * 
 * @export
 * @enum {string}
 */
export enum AxisConfigOrient {
    Left = 'left',
    Right = 'right',
    Top = 'top',
    Bottom = 'bottom'
}

/**
 * 
 * @export
 * @interface BarOptions
 */
export interface BarOptions {
    /**
     * 
     * @type {FieldRef}
     * @memberof BarOptions
     */
    x2?: FieldRef;
    /**
     * 
     * @type {AxisConfig}
     * @memberof BarOptions
     */
    xConfig?: AxisConfig;
    /**
     * 
     * @type {AxisConfig}
     * @memberof BarOptions
     */
    yConfig?: AxisConfig;
    /**
     * 
     * @type {ColorConfig}
     * @memberof BarOptions
     */
    colorConfig?: ColorConfig;
    /**
     * 
     * @type {BarOptionsBarConfig}
     * @memberof BarOptions
     */
    barConfig?: BarOptionsBarConfig;
    /**
     * 
     * @type {StackMode}
     * @memberof BarOptions
     */
    stack?: StackMode;
    /**
     * 
     * @type {boolean}
     * @memberof BarOptions
     */
    histogram?: boolean;
    /**
     * An escape hatch for visualization settings that do not yet have
     * a typed field of their own. Contents are stored and returned
     * unchanged and are not validated, so newer clients can round-trip
     * settings this version of the schema does not name.
     * 
     * @type {{ [key: string]: any | undefined; }}
     * @memberof BarOptions
     */
    extensions?: { [key: string]: any | undefined; };
}


/**
 * 
 * @export
 * @interface BarOptionsBarConfig
 */
export interface BarOptionsBarConfig {
    /**
     * 
     * @type {boolean}
     * @memberof BarOptionsBarConfig
     */
    showValues?: boolean;
    /**
     * 
     * @type {ChartAreaFillType}
     * @memberof BarOptionsBarConfig
     */
    areaFillType?: ChartAreaFillType;
    /**
     * 
     * @type {boolean}
     * @memberof BarOptionsBarConfig
     */
    horizontal?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof BarOptionsBarConfig
     */
    grouped?: boolean;
}


/**
 * 
 * @export
 * @interface Card
 */
export interface Card {
    /**
     * 
     * @type {CardType}
     * @memberof Card
     */
    type: CardType;
    /**
     * 
     * @type {Geometry}
     * @memberof Card
     */
    geometry: Geometry;
    /**
     * Populated when `type` is `query`; absent otherwise.
     * @type {Query}
     * @memberof Card
     */
    query?: Query;
    /**
     * The parameter definition rendered as an input control.
     * Populated when `type` is `parameter`; absent otherwise.
     * 
     * @type {Parameter}
     * @memberof Card
     */
    parameter?: Parameter;
    /**
     * Populated when `type` is `markdown`; absent otherwise.
     * @type {MarkdownCard}
     * @memberof Card
     */
    markdown?: MarkdownCard;
    /**
     * Populated when `type` is `image`; absent otherwise.
     * @type {ImageCard}
     * @memberof Card
     */
    image?: ImageCard;
}


/**
 * A card's query: the OPAL pipeline, the data it runs over, and — for
 * cards built with the visual query builder — the builder's state.
 * 
 * @export
 * @interface CardContent
 */
export interface CardContent {
    /**
     * OPAL source, as an array of lines (one statement / line per
     * element; join with newline to reconstruct the source).
     * Newlines are significant in OPAL, so the array form avoids
     * embedded escape sequences and produces clean diffs.
     * Canonical when `builderDef` is absent. Derived (read-only)
     * when `builderDef` is present.
     * 
     * @type {Array<string>}
     * @memberof CardContent
     */
    pipeline: Array<string>;
    /**
     * Data sources for this card's pipeline. Each input provides
     * a named binding accessible via `@name` in OPAL.
     * 
     * @type {Array<Input>}
     * @memberof CardContent
     */
    inputs: Array<Input>;
    /**
     * 
     * @type {CardContentBuilderDef}
     * @memberof CardContent
     */
    builderDef?: CardContentBuilderDef;
}
/**
 * State for the visual query builder. This version of the schema
 * does not give the builder's expression surface a typed shape; it
 * is carried opaquely under `ui`.
 * 
 * When `builderDef` is present the builder is the source of truth
 * and `pipeline` is only a rendering of it, so clients MUST NOT
 * edit `pipeline` directly. When `builderDef` is absent, `pipeline`
 * is the source of truth.
 * 
 * @export
 * @interface CardContentBuilderDef
 */
export interface CardContentBuilderDef {
    /**
     * The builder definition. Opaque: stored and returned
     * unchanged, and its contents are not validated.
     * 
     * @type {{ [key: string]: any | undefined; }}
     * @memberof CardContentBuilderDef
     */
    ui?: { [key: string]: any | undefined; };
}
/**
 * 
 * @export
 * @enum {string}
 */
export enum CardType {
    Query = 'query',
    Parameter = 'parameter',
    Markdown = 'markdown',
    Image = 'image'
}

/**
 * Number formatting for a value axis or table cell. `options`
 * extends `Intl.NumberFormat` options with Observe metric units.
 * 
 * @export
 * @interface CellNumberFormat
 */
export interface CellNumberFormat {
    /**
     * Intl.NumberFormat options (notation, maximumSignificantDigits,
     * etc.) plus `metricUnit`, `metricUnitPrecision`, `isCustomUnit`.
     * 
     * @type {{ [key: string]: any | undefined; }}
     * @memberof CellNumberFormat
     */
    options?: { [key: string]: any | undefined; };
    /**
     * 
     * @type {string}
     * @memberof CellNumberFormat
     */
    locale?: string;
    /**
     * 
     * @type {ColorScaleConfig}
     * @memberof CellNumberFormat
     */
    colorScale?: ColorScaleConfig;
    /**
     * 
     * @type {ThresholdsConfig}
     * @memberof CellNumberFormat
     */
    thresholds?: ThresholdsConfig;
}
/**
 * 
 * @export
 * @interface ChangeOverTimeOptions
 */
export interface ChangeOverTimeOptions {
    /**
     * 
     * @type {FieldRef}
     * @memberof ChangeOverTimeOptions
     */
    key?: FieldRef;
    /**
     * 
     * @type {FieldRef}
     * @memberof ChangeOverTimeOptions
     */
    value?: FieldRef;
    /**
     * 
     * @type {ChangeOverTimeOptionsKeyConfig}
     * @memberof ChangeOverTimeOptions
     */
    keyConfig?: ChangeOverTimeOptionsKeyConfig;
    /**
     * 
     * @type {TopValueConfig}
     * @memberof ChangeOverTimeOptions
     */
    valueConfig?: TopValueConfig;
    /**
     * 
     * @type {TopListOptionsBarConfig}
     * @memberof ChangeOverTimeOptions
     */
    barConfig?: TopListOptionsBarConfig;
    /**
     * An escape hatch for visualization settings that do not yet have
     * a typed field of their own. Contents are stored and returned
     * unchanged and are not validated, so newer clients can round-trip
     * settings this version of the schema does not name.
     * 
     * @type {{ [key: string]: any | undefined; }}
     * @memberof ChangeOverTimeOptions
     */
    extensions?: { [key: string]: any | undefined; };
}
/**
 * 
 * @export
 * @interface ChangeOverTimeOptionsKeyConfig
 */
export interface ChangeOverTimeOptionsKeyConfig {
    /**
     * 
     * @type {string}
     * @memberof ChangeOverTimeOptionsKeyConfig
     */
    label?: string;
    /**
     * 
     * @type {TopListOptionsKeyConfigOrder}
     * @memberof ChangeOverTimeOptionsKeyConfig
     */
    order?: TopListOptionsKeyConfigOrder;
}


/**
 * 
 * @export
 * @enum {string}
 */
export enum ChartAreaFillType {
    SolidFill = 'SolidFill',
    TranslucentFill = 'TranslucentFill',
    GradientFill = 'GradientFill',
    NoFill = 'NoFill'
}

/**
 * Reference to the alert that triggered this chat.
 * @export
 * @interface ChatAlert
 */
export interface ChatAlert {
    /**
     * ID of the alert (monitor_v2_alarm).
     * @type {string}
     * @memberof ChatAlert
     */
    id: string;
}
/**
 * Brief chat metadata included when a reference is expanded.
 * @export
 * @interface ChatBrief
 */
export interface ChatBrief {
    /**
     * Human-visible title. Null when the chat has no title.
     * @type {string}
     * @memberof ChatBrief
     */
    label: string | null;
}
/**
 * A message within a chat including the actual message "parts".
 * Message parts may e.g. contain image data and be quite big, but
 * often also just contain a text snippet.
 * 
 * @export
 * @interface ChatFullMessage
 */
export interface ChatFullMessage {
    /**
     * Client-generated message id scoped to the chat.
     * @type {string}
     * @memberof ChatFullMessage
     */
    id?: string;
    /**
     * Zero-based index of the message within the chat. Output only.
     * @type {number}
     * @memberof ChatFullMessage
     */
    readonly index: number;
    /**
     * The chat revision that includes the last update of this message. Output only.
     * @type {number}
     * @memberof ChatFullMessage
     */
    readonly chatRevision: number;
    /**
     * 
     * @type {User}
     * @memberof ChatFullMessage
     */
    createdBy: User;
    /**
     * 
     * @type {string}
     * @memberof ChatFullMessage
     */
    readonly createdAt: string;
    /**
     * 
     * @type {User}
     * @memberof ChatFullMessage
     */
    updatedBy: User;
    /**
     * 
     * @type {string}
     * @memberof ChatFullMessage
     */
    readonly updatedAt: string;
    /**
     * 
     * @type {ChatFullMessageCreateRequestRole}
     * @memberof ChatFullMessage
     */
    role?: ChatFullMessageCreateRequestRole;
    /**
     * Free-form metadata associated with the message (timings, etc.).
     * @type {{ [key: string]: any | undefined; }}
     * @memberof ChatFullMessage
     */
    metadata?: { [key: string]: any | undefined; };
    /**
     * The full text contained in `parts` for full text indexing.
     * 
     * Since the schema of the message parts is not fully known to
     * the API server, the client needs to fill this field with the logically
     * contained text.
     * 
     * The contents of this field are not shown to the user --
     * the UI uses the more structured information in the `parts` field for
     * that.
     * 
     * @type {string}
     * @memberof ChatFullMessage
     */
    indexedText?: string;
    /**
     * The message parts as defined by the AI SDK. Potentially large.
     * @type {Array<{ [key: string]: any | undefined; }>}
     * @memberof ChatFullMessage
     */
    parts: Array<{ [key: string]: any | undefined; }>;
}


/**
 * A message within a chat including message parts.
 * Message parts may e.g. contain image data and be quite big.
 * 
 * @export
 * @interface ChatFullMessageCreateRequest
 */
export interface ChatFullMessageCreateRequest {
    /**
     * 
     * @type {ChatFullMessageCreateRequestRole}
     * @memberof ChatFullMessageCreateRequest
     */
    role?: ChatFullMessageCreateRequestRole;
    /**
     * Free-form metadata associated with the message (timings, etc.).
     * @type {{ [key: string]: any | undefined; }}
     * @memberof ChatFullMessageCreateRequest
     */
    metadata?: { [key: string]: any | undefined; };
    /**
     * Client-generated message id scoped to the chat.
     * @type {string}
     * @memberof ChatFullMessageCreateRequest
     */
    id?: string;
    /**
     * The full text contained in `parts` for full text indexing.
     * 
     * Since the schema of the message parts is not fully known to
     * the API server, the client needs to fill this field with the logically
     * contained text.
     * 
     * The contents of this field are not shown to the user --
     * the UI uses the more structured information in the `parts` field for
     * that.
     * 
     * @type {string}
     * @memberof ChatFullMessageCreateRequest
     */
    indexedText?: string;
    /**
     * The message parts as defined by the AI SDK. Potentially large.
     * @type {Array<{ [key: string]: any | undefined; }>}
     * @memberof ChatFullMessageCreateRequest
     */
    parts: Array<{ [key: string]: any | undefined; }>;
}


/**
 * 
 * @export
 * @enum {string}
 */
export enum ChatFullMessageCreateRequestRole {
    System = 'system',
    User = 'user',
    Assistant = 'assistant',
    Data = 'data'
}

/**
 * The readonly server fields of a message within a chat.
 * @export
 * @interface ChatMessageReadOnly
 */
export interface ChatMessageReadOnly {
    /**
     * Client-generated message id scoped to the chat.
     * @type {string}
     * @memberof ChatMessageReadOnly
     */
    id?: string;
    /**
     * Zero-based index of the message within the chat. Output only.
     * @type {number}
     * @memberof ChatMessageReadOnly
     */
    readonly index: number;
    /**
     * The chat revision that includes the last update of this message. Output only.
     * @type {number}
     * @memberof ChatMessageReadOnly
     */
    readonly chatRevision: number;
    /**
     * 
     * @type {User}
     * @memberof ChatMessageReadOnly
     */
    createdBy: User;
    /**
     * 
     * @type {string}
     * @memberof ChatMessageReadOnly
     */
    readonly createdAt: string;
    /**
     * 
     * @type {User}
     * @memberof ChatMessageReadOnly
     */
    updatedBy: User;
    /**
     * 
     * @type {string}
     * @memberof ChatMessageReadOnly
     */
    readonly updatedAt: string;
}
/**
 * Reference to a chat. Always carries the `id`. The `record` field is
 * populated with brief metadata only when `expand=true`.
 * 
 * @export
 * @interface ChatRef
 */
export interface ChatRef {
    /**
     * Uniquely identifies a chat.
     * @type {string}
     * @memberof ChatRef
     */
    id: string;
    /**
     * 
     * @type {ChatBrief}
     * @memberof ChatRef
     */
    record?: ChatBrief;
}
/**
 * A chat resource - a conversation with the LLM agent.
 * 
 * The content of the conversation is in separate messages which
 * can be inlined into the resource for some operations with `?expand=true`.
 * 
 * @export
 * @interface ChatResource
 */
export interface ChatResource {
    /**
     * Uniquely identifies a chat. Output only.
     * @type {string}
     * @memberof ChatResource
     */
    readonly id: string;
    /**
     * Monotonically increasing with every update to the chat or its messages. Output only.
     * @type {number}
     * @memberof ChatResource
     */
    readonly revision: number;
    /**
     * 
     * @type {User}
     * @memberof ChatResource
     */
    readonly createdBy: User;
    /**
     * 
     * @type {string}
     * @memberof ChatResource
     */
    readonly createdAt: string;
    /**
     * 
     * @type {User}
     * @memberof ChatResource
     */
    readonly updatedBy: User;
    /**
     * 
     * @type {string}
     * @memberof ChatResource
     */
    readonly updatedAt: string;
    /**
     * Optional human visible title
     * @type {string}
     * @memberof ChatResource
     */
    label?: string;
    /**
     * Optional chat summary
     * @type {string}
     * @memberof ChatResource
     */
    summary?: string;
    /**
     * ID of the currently active stream, or null when no stream is active.
     * Used to determine whether the chat is in-progress (streaming) or idle/completed.
     * 
     * @type {string}
     * @memberof ChatResource
     */
    activeStreamId: string | null;
    /**
     * 
     * @type {ChatAlert}
     * @memberof ChatResource
     */
    alert: ChatAlert | null;
    /**
     * Present only when `expand=true`. Output only.
     * @type {Array<ChatFullMessage>}
     * @memberof ChatResource
     */
    messages?: Array<ChatFullMessage>;
}
/**
 * Color encoding. `field` selects the column driving color (often
 * the same series as `Visualization.groupBy`); `config` carries the
 * styling.
 * 
 * @export
 * @interface ColorConfig
 */
export interface ColorConfig {
    /**
     * 
     * @type {FieldRef}
     * @memberof ColorConfig
     */
    field?: FieldRef;
    /**
     * 
     * @type {ColorConfigConfig}
     * @memberof ColorConfig
     */
    config?: ColorConfigConfig;
}
/**
 * 
 * @export
 * @interface ColorConfigConfig
 */
export interface ColorConfigConfig {
    /**
     * 
     * @type {ColorConfigConfigColorConfigType}
     * @memberof ColorConfigConfig
     */
    colorConfigType?: ColorConfigConfigColorConfigType;
    /**
     * A named swatch color or an arbitrary CSS color string.
     * @type {string}
     * @memberof ColorConfigConfig
     */
    color?: string;
    /**
     * 
     * @type {ThresholdsConfig}
     * @memberof ColorConfigConfig
     */
    thresholds?: ThresholdsConfig;
    /**
     * 
     * @type {Array<ColorConfigConfigColorMappingInner>}
     * @memberof ColorConfigConfig
     */
    colorMapping?: Array<ColorConfigConfigColorMappingInner>;
    /**
     * 
     * @type {ColorScaleConfig}
     * @memberof ColorConfigConfig
     */
    colorScale?: ColorScaleConfig;
}


/**
 * 
 * @export
 * @enum {string}
 */
export enum ColorConfigConfigColorConfigType {
    Color = 'Color',
    Threshold = 'Threshold',
    Mapping = 'Mapping',
    Range = 'Range'
}

/**
 * 
 * @export
 * @interface ColorConfigConfigColorMappingInner
 */
export interface ColorConfigConfigColorMappingInner {
    /**
     * 
     * @type {string}
     * @memberof ColorConfigConfigColorMappingInner
     */
    key: string | null;
    /**
     * A named swatch color or an arbitrary CSS color string.
     * @type {string}
     * @memberof ColorConfigConfigColorMappingInner
     */
    color: string;
    /**
     * 
     * @type {ColorConfigConfigColorMappingInnerMatchType}
     * @memberof ColorConfigConfigColorMappingInner
     */
    matchType?: ColorConfigConfigColorMappingInnerMatchType;
}


/**
 * 
 * @export
 * @enum {string}
 */
export enum ColorConfigConfigColorMappingInnerMatchType {
    Regex = 'regex'
}

/**
 * 
 * @export
 * @interface ColorScaleConfig
 */
export interface ColorScaleConfig {
    /**
     * 
     * @type {ColorScaleConfigColorScaleType}
     * @memberof ColorScaleConfig
     */
    colorScaleType: ColorScaleConfigColorScaleType;
    /**
     * 
     * @type {AxisBounds}
     * @memberof ColorScaleConfig
     */
    bounds?: AxisBounds;
    /**
     * 
     * @type {SequentialColorScale}
     * @memberof ColorScaleConfig
     */
    sequentialColorScale?: SequentialColorScale;
    /**
     * 
     * @type {DivergingColorScale}
     * @memberof ColorScaleConfig
     */
    divergingColorScale?: DivergingColorScale;
    /**
     * 
     * @type {DivergingScaleMidpoint}
     * @memberof ColorScaleConfig
     */
    divergingScaleMidpoint?: DivergingScaleMidpoint;
    /**
     * 
     * @type {boolean}
     * @memberof ColorScaleConfig
     */
    reverseColors?: boolean;
    /**
     * 
     * @type {ColorScaleConfigTarget}
     * @memberof ColorScaleConfig
     */
    target?: ColorScaleConfigTarget;
    /**
     * 
     * @type {boolean}
     * @memberof ColorScaleConfig
     */
    ignoreMinimum?: boolean;
}


/**
 * 
 * @export
 * @enum {string}
 */
export enum ColorScaleConfigColorScaleType {
    Sequential = 'Sequential',
    Diverging = 'Diverging'
}

/**
 * Cell color target (table / single-stat contexts).
 * @export
 * @enum {string}
 */
export enum ColorScaleConfigTarget {
    Text = 'text',
    Fill = 'fill',
    Pill = 'pill'
}

/**
 * Formatting rules for a single column.
 * @export
 * @interface ColumnFormatting
 */
export interface ColumnFormatting {
    /**
     * Map specific values to colors.
     * @type {Array<ColumnFormattingValueColorsInner>}
     * @memberof ColumnFormatting
     */
    valueColors?: Array<ColumnFormattingValueColorsInner>;
    /**
     * 
     * @type {ColumnFormattingColorTarget}
     * @memberof ColumnFormatting
     */
    colorTarget?: ColumnFormattingColorTarget;
    /**
     * Continuous color scale for numeric cells in this column.
     * Uses the shared `ColorScaleConfig` so both the sequential
     * and diverging scale selections, the diverging midpoint,
     * bounds, and the `reverseColors` / `ignoreMinimum` toggles
     * round-trip losslessly.
     * 
     * @type {ColorScaleConfig}
     * @memberof ColumnFormatting
     */
    colorScale?: ColorScaleConfig;
    /**
     * Intl.NumberFormat options for the column (e.g. notation,
     * maximumSignificantDigits).
     * 
     * @type {{ [key: string]: any | undefined; }}
     * @memberof ColumnFormatting
     */
    numberFormat?: { [key: string]: any | undefined; };
    /**
     * Banded conditional coloring for numeric cells in this column.
     * 
     * @type {ThresholdsConfig}
     * @memberof ColumnFormatting
     */
    thresholds?: ThresholdsConfig;
    /**
     * 
     * @type {string}
     * @memberof ColumnFormatting
     */
    prefix?: string;
    /**
     * 
     * @type {string}
     * @memberof ColumnFormatting
     */
    suffix?: string;
}


/**
 * Where to apply value colors. Default `pill`. Omit when
 * default.
 * 
 * @export
 * @enum {string}
 */
export enum ColumnFormattingColorTarget {
    Pill = 'pill',
    Text = 'text',
    Fill = 'fill'
}

/**
 * 
 * @export
 * @interface ColumnFormattingValueColorsInner
 */
export interface ColumnFormattingValueColorsInner {
    /**
     * 
     * @type {string}
     * @memberof ColumnFormattingValueColorsInner
     */
    value: string;
    /**
     * 
     * @type {string}
     * @memberof ColumnFormattingValueColorsInner
     */
    color: string;
}
/**
 * The foreign key of a link column. Describes how this dataset joins to
 * the dataset the link points at, so the rule can filter through the link.
 * 
 * @export
 * @interface ColumnLink
 */
export interface ColumnLink {
    /**
     * Foreign-key label, used as the linked-column name in OPAL.
     * @type {string}
     * @memberof ColumnLink
     */
    label: string;
    /**
     * Dataset the link points at.
     * @type {string}
     * @memberof ColumnLink
     */
    targetDatasetId?: string;
    /**
     * Foreign-key type (e.g. `linked`).
     * @type {string}
     * @memberof ColumnLink
     */
    linkType?: string;
    /**
     * Source-side key fields on this dataset.
     * @type {Array<string>}
     * @memberof ColumnLink
     */
    srcFields?: Array<string>;
    /**
     * Destination-side key fields on the target dataset.
     * @type {Array<string>}
     * @memberof ColumnLink
     */
    dstFields?: Array<string>;
    /**
     * Label of the target stage the link resolves against. Usually empty.
     * @type {string}
     * @memberof ColumnLink
     */
    targetStageLabel?: string;
}
/**
 * A reference to a column the rule filters on.
 * @export
 * @interface ColumnRef
 */
export interface ColumnRef {
    /**
     * 
     * @type {string}
     * @memberof ColumnRef
     */
    id: string;
    /**
     * The column's OPAL type (e.g. `string`, `int64`, `link`). Used to
     * cast the rule's values to the column's type when the filter is
     * compiled to OPAL. Optional: omit to compare the values without
     * casting them.
     * 
     * @type {string}
     * @memberof ColumnRef
     */
    type?: string;
    /**
     * Dotted path within an object/variant/JSON column (e.g.
     * `data.user.status`). Omit for a whole-column reference.
     * 
     * @type {string}
     * @memberof ColumnRef
     */
    path?: string;
    /**
     * Present when the column is a foreign-key / link column.
     * @type {ColumnLink}
     * @memberof ColumnRef
     */
    link?: ColumnLink;
}
/**
 * 
 * @export
 * @interface CustomVegaLiteOptions
 */
export interface CustomVegaLiteOptions {
    /**
     * Full Vega-Lite specification (JSON).
     * @type {{ [key: string]: any | undefined; }}
     * @memberof CustomVegaLiteOptions
     */
    spec?: { [key: string]: any | undefined; };
    /**
     * Editor metadata; renderers ignore it.
     * @type {string}
     * @memberof CustomVegaLiteOptions
     */
    prompt?: string;
    /**
     * An escape hatch for visualization settings that do not yet have
     * a typed field of their own. Contents are stored and returned
     * unchanged and are not validated, so newer clients can round-trip
     * settings this version of the schema does not name.
     * 
     * @type {{ [key: string]: any | undefined; }}
     * @memberof CustomVegaLiteOptions
     */
    extensions?: { [key: string]: any | undefined; };
}
/**
 * 
 * @export
 * @interface CustomVegaOptions
 */
export interface CustomVegaOptions {
    /**
     * Full Vega specification (JSON).
     * @type {{ [key: string]: any | undefined; }}
     * @memberof CustomVegaOptions
     */
    spec?: { [key: string]: any | undefined; };
    /**
     * Editor metadata; renderers ignore it.
     * @type {string}
     * @memberof CustomVegaOptions
     */
    prompt?: string;
    /**
     * An escape hatch for visualization settings that do not yet have
     * a typed field of their own. Contents are stored and returned
     * unchanged and are not validated, so newer clients can round-trip
     * settings this version of the schema does not name.
     * 
     * @type {{ [key: string]: any | undefined; }}
     * @memberof CustomVegaOptions
     */
    extensions?: { [key: string]: any | undefined; };
}
/**
 * The dashboard body — what the dashboard shows — kept separate
 * from the identity, audit, and governance metadata on the
 * dashboard itself so the two can evolve independently. This is
 * the object governed by `schemaVersion`.
 * 
 * @export
 * @interface DashboardContent
 */
export interface DashboardContent {
    /**
     * 
     * @type {FrontendTimeRange}
     * @memberof DashboardContent
     */
    defaultTimeRange?: FrontendTimeRange;
    /**
     * Optional filterable dataset that acts as a cross-card filter
     * source. Cards reference it via `Input.source.datasetFilter`.
     * The current UI allows at most one per dashboard.
     * 
     * @type {DatasetFilter}
     * @memberof DashboardContent
     */
    datasetFilter?: DatasetFilter;
    /**
     * Parameters that are not placed on the grid as a
     * parameter card in any section. They still drive the
     * dashboard's queries. This is separate from
     * `Parameter.hidden`, which hides the input control of a
     * parameter that *is* placed.
     * 
     * @type {Array<Parameter>}
     * @memberof DashboardContent
     */
    hiddenParameters?: Array<Parameter>;
    /**
     * Data-only query cards that are not displayed in any section.
     * Typically shared base queries referenced as inputs by visible
     * cards. Each must have an `id` so other cards can reference it.
     * 
     * @type {Array<Query>}
     * @memberof DashboardContent
     */
    hiddenQueries?: Array<Query>;
    /**
     * Opaque dashboard-level UI state, stored and returned
     * unchanged. Must be a JSON object; its contents are not
     * validated. Recognized keys include
     * `liveMode` (auto-refresh enabled), `autoPack`,
     * `selectedCardId`, and `additionalDatasetFilters`, which
     * holds any filterable datasets beyond the primary
     * `datasetFilter`.
     * 
     * @type {{ [key: string]: any | undefined; }}
     * @memberof DashboardContent
     */
    ui?: { [key: string]: any | undefined; };
    /**
     * 
     * @type {Layout}
     * @memberof DashboardContent
     */
    layout: Layout;
}
/**
 * Request body for creating a dashboard. Identity and audit fields are
 * assigned by the server.
 * 
 * @export
 * @interface DashboardCreateRequest
 */
export interface DashboardCreateRequest {
    /**
     * 
     * @type {DashboardCreateRequestSchemaVersion}
     * @memberof DashboardCreateRequest
     */
    schemaVersion: DashboardCreateRequestSchemaVersion;
    /**
     * 
     * @type {string}
     * @memberof DashboardCreateRequest
     */
    name: string;
    /**
     * 
     * @type {string}
     * @memberof DashboardCreateRequest
     */
    description?: string | null;
    /**
     * 
     * @type {DashboardCreateRequestVisibility}
     * @memberof DashboardCreateRequest
     */
    visibility?: DashboardCreateRequestVisibility;
    /**
     * User-applied tags for organization and discovery, as a map of tag key
     * to a list of values. For example: {"env": ["prod", "staging"], "team": ["platform"]}.
     * 
     * @type {{ [key: string]: Array<string> | undefined; }}
     * @memberof DashboardCreateRequest
     */
    objectTags?: { [key: string]: Array<string> | undefined; };
    /**
     * 
     * @type {DashboardContent}
     * @memberof DashboardCreateRequest
     */
    definition: DashboardContent;
}


/**
 * Must be `2`.
 * @export
 * @enum {string}
 */
export enum DashboardCreateRequestSchemaVersion {
    NUMBER_2 = 2
}

/**
 * Default `Listed` when omitted.
 * @export
 * @enum {string}
 */
export enum DashboardCreateRequestVisibility {
    Listed = 'Listed',
    Hidden = 'Hidden'
}

/**
 * Dashboard envelope metadata returned by list. Does not include `definition`.
 * 
 * When `expand=true`, `createdBy` and `updatedBy` include display
 * fields (e.g. `label`); `managedBy.record` is populated. Without
 * `expand`, references contain only `id`.
 * 
 * @export
 * @interface DashboardListItem
 */
export interface DashboardListItem {
    /**
     * 
     * @type {string}
     * @memberof DashboardListItem
     */
    readonly id: string;
    /**
     * 
     * @type {DashboardListItemSchemaVersion}
     * @memberof DashboardListItem
     */
    schemaVersion: DashboardListItemSchemaVersion;
    /**
     * 
     * @type {string}
     * @memberof DashboardListItem
     */
    name: string;
    /**
     * 
     * @type {string}
     * @memberof DashboardListItem
     */
    description: string | null;
    /**
     * 
     * @type {string}
     * @memberof DashboardListItem
     */
    createdAt: string;
    /**
     * 
     * @type {string}
     * @memberof DashboardListItem
     */
    updatedAt: string;
    /**
     * 
     * @type {User}
     * @memberof DashboardListItem
     */
    createdBy: User;
    /**
     * 
     * @type {User}
     * @memberof DashboardListItem
     */
    updatedBy: User;
    /**
     * 
     * @type {ObjectRef}
     * @memberof DashboardListItem
     */
    managedBy: ObjectRef | null;
    /**
     * 
     * @type {DashboardListItemVisibility}
     * @memberof DashboardListItem
     */
    visibility: DashboardListItemVisibility;
    /**
     * User-applied tags for organization and discovery, as a map of tag key
     * to a list of values. For example: {"env": ["prod", "staging"], "team": ["platform"]}.
     * 
     * @type {{ [key: string]: Array<string> | undefined; }}
     * @memberof DashboardListItem
     */
    objectTags: { [key: string]: Array<string> | undefined; };
}


/**
 * Dashboard document schema version. Always `2` on the wire.
 * @export
 * @enum {string}
 */
export enum DashboardListItemSchemaVersion {
    NUMBER_2 = 2
}

/**
 * 
 * @export
 * @enum {string}
 */
export enum DashboardListItemVisibility {
    Listed = 'Listed',
    Hidden = 'Hidden'
}

/**
 * 
 * @export
 * @interface DashboardListResponse
 */
export interface DashboardListResponse {
    /**
     * This page of results. Empty when the filter matches nothing or the
     * offset is past the end.
     * 
     * @type {Array<DashboardListItem>}
     * @memberof DashboardListResponse
     */
    dashboards: Array<DashboardListItem>;
    /**
     * 
     * @type {Meta}
     * @memberof DashboardListResponse
     */
    meta: Meta;
    /**
     * Items that could not be returned. Each entry identifies the dashboard
     * by `id` and includes a `type`/`message` explaining why it was omitted.
     * Empty when all items were returned successfully.
     * 
     * @type {Array<DashboardListResponseErrorsInner>}
     * @memberof DashboardListResponse
     */
    errors: Array<DashboardListResponseErrorsInner>;
}
/**
 * 
 * @export
 * @interface DashboardListResponseErrorsInner
 */
export interface DashboardListResponseErrorsInner {
    /**
     * 
     * @type {string}
     * @memberof DashboardListResponseErrorsInner
     */
    id: string;
    /**
     * Stable machine-readable error type.
     * @type {string}
     * @memberof DashboardListResponseErrorsInner
     */
    type: string;
    /**
     * Human-readable explanation of why this item was omitted.
     * @type {string}
     * @memberof DashboardListResponseErrorsInner
     */
    message: string;
}
/**
 * Full dashboard resource returned by Get, Create, and Update. Includes
 * all envelope fields from the list item plus `definition`.
 * 
 * When `expand=true`, `createdBy` and `updatedBy` include display
 * fields (e.g. `label`); `managedBy.record` is populated. Without
 * `expand`, references contain only `id`.
 * 
 * @export
 * @interface DashboardResource
 */
export interface DashboardResource {
    /**
     * 
     * @type {string}
     * @memberof DashboardResource
     */
    readonly id: string;
    /**
     * 
     * @type {DashboardListItemSchemaVersion}
     * @memberof DashboardResource
     */
    schemaVersion: DashboardListItemSchemaVersion;
    /**
     * 
     * @type {string}
     * @memberof DashboardResource
     */
    name: string;
    /**
     * 
     * @type {string}
     * @memberof DashboardResource
     */
    description: string | null;
    /**
     * 
     * @type {string}
     * @memberof DashboardResource
     */
    createdAt: string;
    /**
     * 
     * @type {string}
     * @memberof DashboardResource
     */
    updatedAt: string;
    /**
     * 
     * @type {User}
     * @memberof DashboardResource
     */
    createdBy: User;
    /**
     * 
     * @type {User}
     * @memberof DashboardResource
     */
    updatedBy: User;
    /**
     * 
     * @type {ObjectRef}
     * @memberof DashboardResource
     */
    managedBy: ObjectRef | null;
    /**
     * 
     * @type {DashboardListItemVisibility}
     * @memberof DashboardResource
     */
    visibility: DashboardListItemVisibility;
    /**
     * User-applied tags for organization and discovery, as a map of tag key
     * to a list of values. For example: {"env": ["prod", "staging"], "team": ["platform"]}.
     * 
     * @type {{ [key: string]: Array<string> | undefined; }}
     * @memberof DashboardResource
     */
    objectTags: { [key: string]: Array<string> | undefined; };
    /**
     * 
     * @type {DashboardContent}
     * @memberof DashboardResource
     */
    definition: DashboardContent;
}


/**
 * Merge-patch (RFC 7396) body for a dashboard. Only fields present are
 * applied. When `definition` is present it replaces the whole document.
 * 
 * @export
 * @interface DashboardUpdateRequest
 */
export interface DashboardUpdateRequest {
    /**
     * 
     * @type {DashboardUpdateRequestSchemaVersion}
     * @memberof DashboardUpdateRequest
     */
    schemaVersion?: DashboardUpdateRequestSchemaVersion;
    /**
     * 
     * @type {string}
     * @memberof DashboardUpdateRequest
     */
    name?: string;
    /**
     * 
     * @type {string}
     * @memberof DashboardUpdateRequest
     */
    description?: string | null;
    /**
     * 
     * @type {DashboardListItemVisibility}
     * @memberof DashboardUpdateRequest
     */
    visibility?: DashboardListItemVisibility;
    /**
     * User-applied tags for organization and discovery, as a map of tag key
     * to a list of values. For example: {"env": ["prod", "staging"], "team": ["platform"]}.
     * 
     * @type {{ [key: string]: Array<string> | undefined; }}
     * @memberof DashboardUpdateRequest
     */
    objectTags?: { [key: string]: Array<string> | undefined; };
    /**
     * 
     * @type {DashboardContent}
     * @memberof DashboardUpdateRequest
     */
    definition?: DashboardContent;
}


/**
 * Must be `2` when sent.
 * @export
 * @enum {string}
 */
export enum DashboardUpdateRequestSchemaVersion {
    NUMBER_2 = 2
}

/**
 * 
 * @export
 * @interface DatasetAccelerationError
 */
export interface DatasetAccelerationError {
    /**
     * 
     * @type {string}
     * @memberof DatasetAccelerationError
     */
    time: string;
    /**
     * 
     * @type {string}
     * @memberof DatasetAccelerationError
     */
    errorText: string;
}
/**
 * 
 * @export
 * @interface DatasetAccelerationInfo
 */
export interface DatasetAccelerationInfo {
    /**
     * 
     * @type {DatasetAccelerationState}
     * @memberof DatasetAccelerationInfo
     */
    state: DatasetAccelerationState;
    /**
     * Live staleness of the dataset. Null if alwaysAccelerated is true.
     * @type {number}
     * @memberof DatasetAccelerationInfo
     */
    stalenessSeconds: number | null;
    /**
     * A stable, conservative measurement of what staleness the dataset is achieving
     * over the past few hours. Null if alwaysAccelerated is true.
     * 
     * @type {number}
     * @memberof DatasetAccelerationInfo
     */
    recentStalenessSeconds: number | null;
    /**
     * Reasons explaining why this dataset's freshness is what it is.
     * Empty array indicates the dataset is meeting its freshness goal.
     * Today the server returns at most one dominant reason; the list
     * shape is reserved so we can return multiple stacked reasons
     * (e.g. cost-throttle + decay together) in the future without an
     * API contract change.
     * 
     * @type {Array<DatasetStalenessReason>}
     * @memberof DatasetAccelerationInfo
     */
    stalenessReasons: Array<DatasetStalenessReason>;
    /**
     * User-configured staleness target of the dataset. Set to default value if not set by user.
     * Actual target may be higher due to decaying or credit manager overrides.
     * 
     * @type {number}
     * @memberof DatasetAccelerationInfo
     */
    userConfiguredTargetStalenessSeconds: number | null;
    /**
     * Target staleness of the dataset, ignoring downstream freshness goals.
     * This can be higher than the configured staleness target due to decaying or credit manager overrides.
     * 
     * @type {number}
     * @memberof DatasetAccelerationInfo
     */
    targetExcludingDownstreamStalenessSeconds: number | null;
    /**
     * Effective target staleness of the dataset. This is the value that the dataset is being kept up to date to.
     * This can be higher or lower than the user-configured target staleness if the credit manager is active or downstream datasets staleness targets demand it.
     * 
     * If `effectiveTargetStalenessSeconds > userConfiguredTargetStalenessSeconds`, then the credit manager is active on this dataset, and
     * `effectiveTargetStalenessSeconds == rateLimitOverrideTargetStalenessSeconds`.
     * If `effectiveTargetStalenessSeconds < userConfiguredTargetStalenessSeconds`, then a downstream dataset/monitor has a lower configured freshness goal.
     * If `effectiveTargetStalenessSeconds == userConfiguredTargetStalenessSeconds`, then the configured freshness goal is in effect.
     * 
     * @type {number}
     * @memberof DatasetAccelerationInfo
     */
    effectiveTargetStalenessSeconds: number | null;
    /**
     * The target staleness override for this dataset from the credit manager, if
     * a transform credit rate limit is configured and is causing this dataset's
     * configured freshness goal to be overridden.
     * 
     * @type {number}
     * @memberof DatasetAccelerationInfo
     */
    rateLimitOverrideTargetStalenessSeconds: number | null;
    /**
     * 
     * @type {boolean}
     * @memberof DatasetAccelerationInfo
     */
    alwaysAccelerated: boolean;
    /**
     * 
     * @type {Array<OpenTimeRange>}
     * @memberof DatasetAccelerationInfo
     */
    acceleratedRanges: Array<OpenTimeRange>;
    /**
     * 
     * @type {Array<OpenTimeRange>}
     * @memberof DatasetAccelerationInfo
     */
    targetAcceleratedRanges: Array<OpenTimeRange>;
    /**
     * 
     * @type {string}
     * @memberof DatasetAccelerationInfo
     */
    freshnessTime: string | null;
    /**
     * 
     * @type {number}
     * @memberof DatasetAccelerationInfo
     */
    effectiveOnDemandMaterializationLengthDays: number;
    /**
     * 
     * @type {boolean}
     * @memberof DatasetAccelerationInfo
     */
    dataRetentionEnabled: boolean;
    /**
     * 
     * @type {number}
     * @memberof DatasetAccelerationInfo
     */
    effectiveDataRetentionPeriodDays: number | null;
    /**
     * 
     * @type {string}
     * @memberof DatasetAccelerationInfo
     */
    effectiveDataRetentionTimestamp: string | null;
    /**
     * 
     * @type {string}
     * @memberof DatasetAccelerationInfo
     */
    minimumDataTimestamp: string | null;
    /**
     * 
     * @type {string}
     * @memberof DatasetAccelerationInfo
     */
    hibernatedAt: string | null;
    /**
     * 
     * @type {Array<DatasetAccelerationError>}
     * @memberof DatasetAccelerationInfo
     */
    errors: Array<DatasetAccelerationError>;
}


/**
 * The state of the dataset's acceleration.
 * Initializing: The dataset is newly created/updated and acceleration has just started.
 * Accelerated: The dataset is accelerated and available for querying.
 * AcceleratedImmediately: The dataset is accelerated and available for querying. The dataset is also in "live mode", meaning it is being updated as fast as possible.
 * Unavailable: The dataset is not accelerated and is not available for querying due to a compilation error in the dataset or upstream.
 * Disabled: The dataset is not accelerated and is available for querying due to user disablement. (e.g. dataset is a view)
 * Error: The dataset is not accelerated and may return outdated results due to a critical error.
 * 
 * @export
 * @enum {string}
 */
export enum DatasetAccelerationState {
    Initializing = 'Initializing',
    Accelerated = 'Accelerated',
    AcceleratedImmediately = 'AcceleratedImmediately',
    Unavailable = 'Unavailable',
    Disabled = 'Disabled',
    Error = 'Error'
}

/**
 * 
 * @export
 * @enum {string}
 */
export enum DatasetAccelerationType {
    InsertOnly = 'InsertOnly',
    Aggregation = 'Aggregation',
    Other = 'Other',
    NotSupported = 'NotSupported'
}

/**
 * Brief record fields for a DatasetRef (label, description, iconUrl, contentType). Field naming mirrors ObjectBrief in this same file (iconUrl, not icon) for consistency across reference-brief pairs.
 * 
 * @export
 * @interface DatasetBrief
 */
export interface DatasetBrief {
    /**
     * 
     * @type {string}
     * @memberof DatasetBrief
     */
    label: string;
    /**
     * 
     * @type {string}
     * @memberof DatasetBrief
     */
    description: string;
    /**
     * 
     * @type {string}
     * @memberof DatasetBrief
     */
    iconUrl: string;
    /**
     * The type of data the referenced dataset contains — Resource, Log,
     * Metric, OTelSpan, OTelTrace, or Unknown. Derived from the dataset's
     * kind and interface bindings.
     * 
     * @type {DatasetContentType}
     * @memberof DatasetBrief
     */
    contentType: DatasetContentType;
}


/**
 * 
 * @export
 * @interface DatasetCompilationError
 */
export interface DatasetCompilationError {
    /**
     * 
     * @type {string}
     * @memberof DatasetCompilationError
     */
    error: string;
    /**
     * 
     * @type {DatasetRef}
     * @memberof DatasetCompilationError
     */
    errorInDataset: DatasetRef | null;
}
/**
 * The type of data a dataset contains. For Resource datasets, this is
 * determined by the dataset kind. For other kinds, it is derived from the
 * dataset's interface bindings. Returns Unknown if no recognized interface
 * is found.
 * 
 * @export
 * @enum {string}
 */
export enum DatasetContentType {
    Unknown = 'Unknown',
    Resource = 'Resource',
    Log = 'Log',
    Metric = 'Metric',
    OTelSpan = 'OTelSpan',
    OTelTrace = 'OTelTrace'
}

/**
 * 
 * @export
 * @interface DatasetCorrelationTag
 */
export interface DatasetCorrelationTag {
    /**
     * 
     * @type {string}
     * @memberof DatasetCorrelationTag
     */
    tag: string;
    /**
     * 
     * @type {DatasetFieldPath}
     * @memberof DatasetCorrelationTag
     */
    path: DatasetFieldPath;
}
/**
 * 
 * @export
 * @enum {string}
 */
export enum DatasetDataType {
    None = 'None',
    Bool = 'Bool',
    Float64 = 'Float64',
    Int64 = 'Int64',
    String = 'String',
    Timestamp = 'Timestamp',
    Duration = 'Duration',
    Ipv4 = 'IPv4',
    TDigest = 'TDigest',
    Array = 'Array',
    Object = 'Object',
    Variant = 'Variant',
    Link = 'Link',
    DatasetRef = 'DatasetRef'
}

/**
 * 
 * @export
 * @enum {string}
 */
export enum DatasetDatasetKind {
    Table = 'Table',
    Resource = 'Resource',
    Event = 'Event',
    Interval = 'Interval'
}

/**
 * The kind of dataset definition. Values match `metatypes.TransformKind`'s
 * string constants verbatim where the backend has one (`OPAL`, `Builtin`,
 * `LogDerived`); `Source` and `Invalid` are REST-side additions for
 * dataset shapes the backend does not surface as a TransformKind.
 * - OPAL: dataset is produced by an OPAL transform pipeline.
 * - Builtin: dataset is produced by a built-in transform (e.g. canonical-trace).
 * - LogDerived: dataset is a log-derived metric.
 * - Source: dataset receives data directly (datastream or external table); it has no transform.
 * - Invalid: the stored transform kind is empty or unrecognised. Indicates corrupt or partially-migrated data, or a legacy SQL-kind transform (no production datasets carry one as of 2026-05-14).
 * 
 * @export
 * @enum {string}
 */
export enum DatasetDefinitionType {
    Opal = 'OPAL',
    Builtin = 'Builtin',
    LogDerived = 'LogDerived',
    Source = 'Source',
    Invalid = 'Invalid'
}

/**
 * 
 * @export
 * @interface DatasetFieldDesc
 */
export interface DatasetFieldDesc {
    /**
     * 
     * @type {string}
     * @memberof DatasetFieldDesc
     */
    name: string;
    /**
     * 
     * @type {DatasetFieldType}
     * @memberof DatasetFieldDesc
     */
    type: DatasetFieldType;
    /**
     * 
     * @type {Array<DatasetIndexDefinition>}
     * @memberof DatasetFieldDesc
     */
    indexDefs: Array<DatasetIndexDefinition>;
    /**
     * 
     * @type {DatasetForeignKey}
     * @memberof DatasetFieldDesc
     */
    linkDesc: DatasetForeignKey | null;
    /**
     * 
     * @type {boolean}
     * @memberof DatasetFieldDesc
     */
    isEnum: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof DatasetFieldDesc
     */
    isSearchable: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof DatasetFieldDesc
     */
    isHidden: boolean | null;
    /**
     * 
     * @type {boolean}
     * @memberof DatasetFieldDesc
     */
    isConst: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof DatasetFieldDesc
     */
    isMetric: boolean;
}
/**
 * 
 * @export
 * @interface DatasetFieldPath
 */
export interface DatasetFieldPath {
    /**
     * 
     * @type {string}
     * @memberof DatasetFieldPath
     */
    field: string;
    /**
     * 
     * @type {string}
     * @memberof DatasetFieldPath
     */
    path: string;
}
/**
 * 
 * @export
 * @interface DatasetFieldType
 */
export interface DatasetFieldType {
    /**
     * 
     * @type {DatasetDataType}
     * @memberof DatasetFieldType
     */
    tag: DatasetDataType;
}


/**
 * A filterable dataset that acts as a cross-card filter source.
 * Cards reference it via `Input.source.datasetFilter`. The
 * current UI allows creating at most one per dashboard.
 * 
 * @export
 * @interface DatasetFilter
 */
export interface DatasetFilter {
    /**
     * Stable identity of this dataset filter, used by a card input that
     * binds to one specific filter rather than to the primary one.
     * Optional for a document with a single, primary dataset filter.
     * 
     * @type {string}
     * @memberof DatasetFilter
     */
    id?: string;
    /**
     * 
     * @type {string}
     * @memberof DatasetFilter
     */
    datasetId: string;
    /**
     * Human-readable dataset name. Optional but encouraged.
     * @type {string}
     * @memberof DatasetFilter
     */
    name?: string;
    /**
     * Slash-delimited dataset path. Optional but encouraged.
     * @type {string}
     * @memberof DatasetFilter
     */
    path?: string;
    /**
     * The constraints this filter applies, each a `FilterRule`. These are
     * the filters a viewer sees and can change in the filter bar.
     * 
     * @type {Array<FilterRule>}
     * @memberof DatasetFilter
     */
    filterActions?: Array<FilterRule>;
    /**
     * Constraints applied to the dataset before `filterActions`. Same
     * `FilterRule` shape, but these are fixed by the document's author and
     * are not shown in the filter bar.
     * 
     * @type {Array<FilterRule>}
     * @memberof DatasetFilter
     */
    preFilterActions?: Array<FilterRule>;
    /**
     * When `true`, the filter is automatically applied to new
     * cards added to the dashboard. Default `true`. Omit when
     * default.
     * 
     * @type {boolean}
     * @memberof DatasetFilter
     */
    autoApply?: boolean;
}
/**
 * 
 * @export
 * @interface DatasetForeignKey
 */
export interface DatasetForeignKey {
    /**
     * 
     * @type {string}
     * @memberof DatasetForeignKey
     */
    label: string;
    /**
     * 
     * @type {DatasetRef}
     * @memberof DatasetForeignKey
     */
    targetDataset: DatasetRef | null;
    /**
     * 
     * @type {string}
     * @memberof DatasetForeignKey
     */
    targetStageLabel: string | null;
    /**
     * 
     * @type {string}
     * @memberof DatasetForeignKey
     */
    targetLabelField: string | null;
    /**
     * 
     * @type {Array<DatasetFieldPath>}
     * @memberof DatasetForeignKey
     */
    srcPaths: Array<DatasetFieldPath>;
    /**
     * 
     * @type {Array<string>}
     * @memberof DatasetForeignKey
     */
    dstFields: Array<string>;
}
/**
 * Response body for both GET /v1/datasets/graph and GET /v1/datasets/{id}/graph.
 * On the full-graph endpoint: datasets are sorted by id ascending, and meta.totalCount
 * is always the number of returned datasets (never -1).
 * On the focal endpoint: datasets are sorted in BFS-nearest order (focal first, then
 * by BFS depth, ties broken by id ascending for determinism), and meta.totalCount is
 * -1 iff the BFS was capped by limit; otherwise it is the number of returned datasets.
 * 
 * @export
 * @interface DatasetGraphResponse
 */
export interface DatasetGraphResponse {
    /**
     * 
     * @type {Array<DatasetGraphSummary>}
     * @memberof DatasetGraphResponse
     */
    datasets: Array<DatasetGraphSummary>;
    /**
     * 
     * @type {Meta}
     * @memberof DatasetGraphResponse
     */
    meta: Meta;
}
/**
 * Lean per-dataset projection used to render the Dataset Graph, Lineage tab,
 * and Explore Universe views. Intentionally a strict subset of Dataset-Resource:
 * only the fields required to render a graph node and its outgoing edges.
 * expand is not supported on graph endpoints.
 * 
 * NOTE: foreignKeyTargetIds and inputDatasetIds are returned as flat arrays of
 * id strings rather than the nested reference shape used elsewhere in this API.
 * This is a deliberate divergence from the REST Style Guide accepted for payload
 * size on the full-graph endpoint; these fields are not expandable.
 * 
 * @export
 * @interface DatasetGraphSummary
 */
export interface DatasetGraphSummary {
    /**
     * 
     * @type {string}
     * @memberof DatasetGraphSummary
     */
    readonly id: string;
    /**
     * Full dataset label (path/name).
     * @type {string}
     * @memberof DatasetGraphSummary
     */
    label: string;
    /**
     * 
     * @type {DatasetDatasetKind}
     * @memberof DatasetGraphSummary
     */
    kind: DatasetDatasetKind;
    /**
     * The content type (Resource, Log, Metric, OTelSpan, OTelTrace, Unknown).
     * Combined with kind to pick the dataset icon in the UI.
     * 
     * @type {DatasetContentType}
     * @memberof DatasetGraphSummary
     */
    contentType: DatasetContentType;
    /**
     * Explicit icon URL when set; null means the UI should derive from kind + contentType.
     * @type {string}
     * @memberof DatasetGraphSummary
     */
    icon: string | null;
    /**
     * 
     * @type {DatasetCompilationError}
     * @memberof DatasetGraphSummary
     */
    compilationError: DatasetCompilationError | null;
    /**
     * The dataset's current acceleration state, projected out of AccelerationInfo.
     * Exposed as a top-level scalar on this endpoint to avoid batch-loading the
     * full AccelerationInfo object.
     * 
     * @type {DatasetAccelerationState}
     * @memberof DatasetGraphSummary
     */
    accelerationState: DatasetAccelerationState;
    /**
     * Deduplicated list of foreign-key target dataset ids (forward edges only).
     * Self-references and targets pointing at datasets excluded by the default filter
     * are omitted.
     * 
     * @type {Array<string>}
     * @memberof DatasetGraphSummary
     */
    foreignKeyTargetIds: Array<string>;
    /**
     * Deduplicated list of dataset ids that feed this dataset via transform inputs
     * with InputRole=Data. Reference-role inputs are excluded.
     * 
     * @type {Array<string>}
     * @memberof DatasetGraphSummary
     */
    inputDatasetIds: Array<string>;
}


/**
 * 
 * @export
 * @interface DatasetGroupingElement
 */
export interface DatasetGroupingElement {
    /**
     * 
     * @type {DatasetGroupingElementType}
     * @memberof DatasetGroupingElement
     */
    type: DatasetGroupingElementType;
    /**
     * 
     * @type {string}
     * @memberof DatasetGroupingElement
     */
    value: string;
}


/**
 * 
 * @export
 * @enum {string}
 */
export enum DatasetGroupingElementType {
    Field = 'Field',
    Link = 'Link'
}

/**
 * 
 * @export
 * @interface DatasetGroupingKey
 */
export interface DatasetGroupingKey {
    /**
     * 
     * @type {Array<DatasetGroupingElement>}
     * @memberof DatasetGroupingKey
     */
    elements: Array<DatasetGroupingElement>;
}
/**
 * 
 * @export
 * @interface DatasetImplementedInterface
 */
export interface DatasetImplementedInterface {
    /**
     * 
     * @type {string}
     * @memberof DatasetImplementedInterface
     */
    path: string;
    /**
     * 
     * @type {Array<DatasetInterfaceFieldMapping>}
     * @memberof DatasetImplementedInterface
     */
    mapping: Array<DatasetInterfaceFieldMapping>;
}
/**
 * 
 * @export
 * @interface DatasetIndexDefinition
 */
export interface DatasetIndexDefinition {
    /**
     * 
     * @type {string}
     * @memberof DatasetIndexDefinition
     */
    field: string;
    /**
     * 
     * @type {DatasetIndexType}
     * @memberof DatasetIndexDefinition
     */
    type: DatasetIndexType;
}


/**
 * 
 * @export
 * @enum {string}
 */
export enum DatasetIndexType {
    TokenIndex = 'TokenIndex',
    SubstringIndex = 'SubstringIndex',
    EqualityIndex = 'EqualityIndex',
    AutoClusteringIndex = 'AutoClusteringIndex'
}

/**
 * 
 * @export
 * @interface DatasetInterfaceFieldMapping
 */
export interface DatasetInterfaceFieldMapping {
    /**
     * 
     * @type {string}
     * @memberof DatasetInterfaceFieldMapping
     */
    interfaceField: string;
    /**
     * 
     * @type {string}
     * @memberof DatasetInterfaceFieldMapping
     */
    field: string;
}
/**
 * 
 * @export
 * @interface DatasetLegacyResource
 */
export interface DatasetLegacyResource {
    /**
     * 
     * @type {DatasetLegacyResourceMeta}
     * @memberof DatasetLegacyResource
     */
    meta: DatasetLegacyResourceMeta;
    /**
     * 
     * @type {DatasetLegacyResourceConfig}
     * @memberof DatasetLegacyResource
     */
    config: DatasetLegacyResourceConfig;
    /**
     * 
     * @type {DatasetLegacyResourceState}
     * @memberof DatasetLegacyResource
     */
    state: DatasetLegacyResourceState;
}
/**
 * Directly settable properties of the dataset.
 * @export
 * @interface DatasetLegacyResourceConfig
 */
export interface DatasetLegacyResourceConfig {
    /**
     * 
     * @type {string}
     * @memberof DatasetLegacyResourceConfig
     */
    name: string;
}
/**
 * Metadata about the dataset.
 * @export
 * @interface DatasetLegacyResourceMeta
 */
export interface DatasetLegacyResourceMeta {
    /**
     * 
     * @type {string}
     * @memberof DatasetLegacyResourceMeta
     */
    id: string;
    /**
     * 
     * @type {string}
     * @memberof DatasetLegacyResourceMeta
     */
    workspaceId: string;
    /**
     * 
     * @type {string}
     * @memberof DatasetLegacyResourceMeta
     */
    customerId: string;
}
/**
 * Implicitly derived state of the dataset.
 * @export
 * @interface DatasetLegacyResourceState
 */
export interface DatasetLegacyResourceState {
    /**
     * 
     * @type {string}
     * @memberof DatasetLegacyResourceState
     */
    urlPath: string;
    /**
     * 
     * @type {string}
     * @memberof DatasetLegacyResourceState
     */
    kind: string;
    /**
     * 
     * @type {string}
     * @memberof DatasetLegacyResourceState
     */
    createdBy: string;
    /**
     * 
     * @type {string}
     * @memberof DatasetLegacyResourceState
     */
    createdDate: string;
    /**
     * 
     * @type {string}
     * @memberof DatasetLegacyResourceState
     */
    updatedBy: string;
    /**
     * 
     * @type {string}
     * @memberof DatasetLegacyResourceState
     */
    updatedDate: string;
    /**
     * 
     * @type {Array<DatasetLegacyResourceStateColumnsInner>}
     * @memberof DatasetLegacyResourceState
     */
    columns?: Array<DatasetLegacyResourceStateColumnsInner>;
    /**
     * 
     * @type {Array<DatasetLegacyResourceStateInterfacesInner>}
     * @memberof DatasetLegacyResourceState
     */
    interfaces?: Array<DatasetLegacyResourceStateInterfacesInner>;
}
/**
 * 
 * @export
 * @interface DatasetLegacyResourceStateColumnsInner
 */
export interface DatasetLegacyResourceStateColumnsInner {
    /**
     * 
     * @type {string}
     * @memberof DatasetLegacyResourceStateColumnsInner
     */
    name: string;
    /**
     * 
     * @type {string}
     * @memberof DatasetLegacyResourceStateColumnsInner
     */
    type: string;
}
/**
 * 
 * @export
 * @interface DatasetLegacyResourceStateInterfacesInner
 */
export interface DatasetLegacyResourceStateInterfacesInner {
    /**
     * 
     * @type {string}
     * @memberof DatasetLegacyResourceStateInterfacesInner
     */
    path?: string;
    /**
     * 
     * @type {Array<object>}
     * @memberof DatasetLegacyResourceStateInterfacesInner
     */
    mapping?: Array<object>;
}
/**
 * 
 * @export
 * @interface DatasetListResponse
 */
export interface DatasetListResponse {
    /**
     * 
     * @type {Array<DatasetResource>}
     * @memberof DatasetListResponse
     */
    datasets: Array<DatasetResource>;
    /**
     * 
     * @type {Meta}
     * @memberof DatasetListResponse
     */
    meta: Meta;
}
/**
 * 
 * @export
 * @interface DatasetQueryFilterCreateRequest
 */
export interface DatasetQueryFilterCreateRequest {
    /**
     * Human-readable name for the filter
     * @type {string}
     * @memberof DatasetQueryFilterCreateRequest
     */
    label: string;
    /**
     * Long-form description of the filter
     * @type {string}
     * @memberof DatasetQueryFilterCreateRequest
     */
    description?: string;
    /**
     * Legacy OPAL boolean expression string for the filter predicate (without the leading `filter` verb).
     * 
     * Deprecated in favor of `pipeline` and may be removed in a future API version. Exactly one of `filter` or `pipeline` must be provided when creating a filter.
     * 
     * @type {string}
     * @memberof DatasetQueryFilterCreateRequest
     */
    filter?: string;
    /**
     * Canonical OPAL pipeline snippet for the filter. May contain only filter verbs (and comments).
     * 
     * Exactly one of `filter` or `pipeline` must be provided when creating a filter. `pipeline` is preferred for new integrations, as `filter` may be removed in a future API version.
     * 
     * @type {string}
     * @memberof DatasetQueryFilterCreateRequest
     */
    pipeline?: string;
    /**
     * Whether the filter is disabled by the user
     * @type {boolean}
     * @memberof DatasetQueryFilterCreateRequest
     */
    disabled?: boolean;
    /**
     * Activation window start time (inclusive). If omitted, the filter applies from negative infinity (unbounded from the past).
     * @type {string}
     * @memberof DatasetQueryFilterCreateRequest
     */
    startTime?: string;
    /**
     * Activation window end time (exclusive). If omitted, the filter applies to positive infinity (unbounded to the future).
     * @type {string}
     * @memberof DatasetQueryFilterCreateRequest
     */
    endTime?: string;
    /**
     * UI layout/metadata for the filter builder. This field is used by the Observe UI and should be omitted by other clients.
     * @type {string}
     * @memberof DatasetQueryFilterCreateRequest
     */
    layout?: string;
}
/**
 * 
 * @export
 * @interface DatasetQueryFilterResource
 */
export interface DatasetQueryFilterResource {
    /**
     * 
     * @type {string}
     * @memberof DatasetQueryFilterResource
     */
    id: string;
    /**
     * Human-readable name for the filter
     * @type {string}
     * @memberof DatasetQueryFilterResource
     */
    label: string;
    /**
     * Long-form description of the filter
     * @type {string}
     * @memberof DatasetQueryFilterResource
     */
    description?: string;
    /**
     * Legacy OPAL boolean expression string for the filter predicate (without the leading `filter` verb).
     * 
     * Deprecated in favor of `pipeline` and may be removed in a future API version. When creating or updating a filter, clients must provide exactly one of `filter` or `pipeline`.
     * API responses always include both `filter` and `pipeline`; clients should consume `pipeline`.
     * 
     * @type {string}
     * @memberof DatasetQueryFilterResource
     */
    filter: string;
    /**
     * Canonical OPAL pipeline snippet for the filter. May contain only filter verbs (and comments).
     * 
     * When creating or updating a filter, clients must provide exactly one of `filter` or `pipeline`.
     * API responses always include both `filter` and `pipeline`; clients should consume `pipeline`.
     * 
     * @type {string}
     * @memberof DatasetQueryFilterResource
     */
    pipeline: string;
    /**
     * Whether the filter is disabled by the user
     * @type {boolean}
     * @memberof DatasetQueryFilterResource
     */
    disabled: boolean;
    /**
     * List of error messages if the filter has issues (omitted if no errors)
     * @type {Array<string>}
     * @memberof DatasetQueryFilterResource
     */
    errors?: Array<string>;
    /**
     * User who created the filter
     * @type {User}
     * @memberof DatasetQueryFilterResource
     */
    createdBy: User;
    /**
     * When the filter was created
     * @type {string}
     * @memberof DatasetQueryFilterResource
     */
    createdAt: string;
    /**
     * User who last updated the filter
     * @type {User}
     * @memberof DatasetQueryFilterResource
     */
    updatedBy: User;
    /**
     * When the filter was last updated
     * @type {string}
     * @memberof DatasetQueryFilterResource
     */
    updatedAt: string;
    /**
     * Activation window start time (inclusive). If omitted, the filter applies from negative infinity (unbounded from the past).
     * @type {string}
     * @memberof DatasetQueryFilterResource
     */
    startTime?: string;
    /**
     * Activation window end time (exclusive). If omitted, the filter applies to positive infinity (unbounded to the future).
     * @type {string}
     * @memberof DatasetQueryFilterResource
     */
    endTime?: string;
    /**
     * UI layout/metadata for the filter builder. This field is used by the Observe UI and should be omitted by other clients.
     * @type {string}
     * @memberof DatasetQueryFilterResource
     */
    layout?: string;
}
/**
 * 
 * @export
 * @interface DatasetQueryFilterUpdateRequest
 */
export interface DatasetQueryFilterUpdateRequest {
    /**
     * Human-readable name for the filter
     * @type {string}
     * @memberof DatasetQueryFilterUpdateRequest
     */
    label?: string;
    /**
     * Long-form description of the filter
     * @type {string}
     * @memberof DatasetQueryFilterUpdateRequest
     */
    description?: string | null;
    /**
     * Legacy OPAL boolean expression string for the filter predicate (without the leading `filter` verb).
     * 
     * Deprecated in favor of `pipeline` and may be removed in a future API version. When updating a filter's semantics, a request may provide either `filter` or `pipeline`, but not both.
     * 
     * @type {string}
     * @memberof DatasetQueryFilterUpdateRequest
     */
    filter?: string;
    /**
     * Canonical OPAL pipeline snippet for the filter. May contain only filter verbs (and comments).
     * 
     * When updating a filter's semantics, a request may provide either `filter` or `pipeline`, but not both. `pipeline` is preferred, as `filter` may be removed in a future API version.
     * 
     * @type {string}
     * @memberof DatasetQueryFilterUpdateRequest
     */
    pipeline?: string;
    /**
     * Whether the filter is disabled by the user
     * @type {boolean}
     * @memberof DatasetQueryFilterUpdateRequest
     */
    disabled?: boolean;
    /**
     * Activation window start time (inclusive). If omitted, the filter applies from negative infinity (unbounded from the past).
     * @type {string}
     * @memberof DatasetQueryFilterUpdateRequest
     */
    startTime?: string | null;
    /**
     * Activation window end time (exclusive). If omitted, the filter applies to positive infinity (unbounded to the future).
     * @type {string}
     * @memberof DatasetQueryFilterUpdateRequest
     */
    endTime?: string | null;
    /**
     * UI layout/metadata for the filter builder. This field is used by the Observe UI and should be omitted by other clients.
     * @type {string}
     * @memberof DatasetQueryFilterUpdateRequest
     */
    layout?: string | null;
}
/**
 * A reference to a dataset. Always carries the id; the optional `record` field carries the brief metadata, populated when expand=true. Mirrors ObjectRef (see ObjectRef / ObjectBrief in this file).
 * 
 * @export
 * @interface DatasetRef
 */
export interface DatasetRef {
    /**
     * 
     * @type {string}
     * @memberof DatasetRef
     */
    id: string;
    /**
     * 
     * @type {DatasetBrief}
     * @memberof DatasetRef
     */
    record?: DatasetBrief;
}
/**
 * 
 * @export
 * @interface DatasetRelatedKey
 */
export interface DatasetRelatedKey {
    /**
     * 
     * @type {string}
     * @memberof DatasetRelatedKey
     */
    label: string;
    /**
     * 
     * @type {DatasetRef}
     * @memberof DatasetRelatedKey
     */
    targetDataset: DatasetRef;
    /**
     * 
     * @type {Array<string>}
     * @memberof DatasetRelatedKey
     */
    srcFields: Array<string>;
    /**
     * 
     * @type {Array<string>}
     * @memberof DatasetRelatedKey
     */
    dstFields: Array<string>;
}
/**
 * Observe Dataset with properties.
 * @export
 * @interface DatasetResource
 */
export interface DatasetResource {
    /**
     * 
     * @type {string}
     * @memberof DatasetResource
     */
    readonly id: string;
    /**
     * 
     * @type {string}
     * @memberof DatasetResource
     */
    label: string;
    /**
     * 
     * @type {string}
     * @memberof DatasetResource
     */
    description: string;
    /**
     * 
     * @type {string}
     * @memberof DatasetResource
     */
    icon: string;
    /**
     * 
     * @type {DatasetDatasetKind}
     * @memberof DatasetResource
     */
    kind: DatasetDatasetKind;
    /**
     * 
     * @type {string}
     * @memberof DatasetResource
     */
    source: string | null;
    /**
     * 
     * @type {string}
     * @memberof DatasetResource
     */
    lastUpdateSource: string | null;
    /**
     * 
     * @type {Array<DatasetFieldDesc>}
     * @memberof DatasetResource
     */
    fieldList: Array<DatasetFieldDesc>;
    /**
     * 
     * @type {string}
     * @memberof DatasetResource
     */
    validFromField: string | null;
    /**
     * 
     * @type {string}
     * @memberof DatasetResource
     */
    validToField: string | null;
    /**
     * 
     * @type {string}
     * @memberof DatasetResource
     */
    labelField: string | null;
    /**
     * 
     * @type {Array<string>}
     * @memberof DatasetResource
     */
    primaryKey: Array<string>;
    /**
     * 
     * @type {Array<Array<string>>}
     * @memberof DatasetResource
     */
    candidateKeys: Array<Array<string>>;
    /**
     * 
     * @type {Array<DatasetForeignKey>}
     * @memberof DatasetResource
     */
    foreignKeys: Array<DatasetForeignKey>;
    /**
     * 
     * @type {Array<DatasetRelatedKey>}
     * @memberof DatasetResource
     */
    relatedKeys: Array<DatasetRelatedKey>;
    /**
     * 
     * @type {DatasetGroupingKey}
     * @memberof DatasetResource
     */
    groupingKey: DatasetGroupingKey | null;
    /**
     * 
     * @type {Array<DatasetCorrelationTag>}
     * @memberof DatasetResource
     */
    correlationTags: Array<DatasetCorrelationTag>;
    /**
     * 
     * @type {boolean}
     * @memberof DatasetResource
     */
    isSource: boolean;
    /**
     * 
     * @type {Array<DatasetImplementedInterface>}
     * @memberof DatasetResource
     */
    interfaces: Array<DatasetImplementedInterface>;
    /**
     * The type of data this dataset contains. For Resource datasets, determined by
     * the dataset kind. For other kinds, derived from the dataset's interface bindings.
     * Returns Unknown if no recognized interface is found.
     * 
     * @type {DatasetContentType}
     * @memberof DatasetResource
     */
    contentType: DatasetContentType;
    /**
     * Custom field mappings associated with the dataset's content type. Maps canonical
     * field names to column name(s). Most fields map to a single column, but some
     * (e.g. metric "tag") allow multiple columns. The exact set of keys depends on
     * the contentType. For example, a Log dataset might have {"log": ["message"]}, while
     * a Metric dataset might have {"metric": ["metric_name"], "value": ["metric_value"]}.
     * Empty if the dataset has no recognized content type.
     * 
     * @type {{ [key: string]: Array<string> | undefined; }}
     * @memberof DatasetResource
     */
    customFieldMappings: { [key: string]: Array<string> | undefined; };
    /**
     * User-applied tags for organization and discovery, as a map of tag key
     * to a list of values. For example: {"env": ["prod", "staging"], "team": ["platform"]}.
     * 
     * @type {{ [key: string]: Array<string> | undefined; }}
     * @memberof DatasetResource
     */
    objectTags: { [key: string]: Array<string> | undefined; };
    /**
     * 
     * @type {DatasetTimeAlignment}
     * @memberof DatasetResource
     */
    alignment: DatasetTimeAlignment | null;
    /**
     * 
     * @type {DatasetCompilationError}
     * @memberof DatasetResource
     */
    compilationError: DatasetCompilationError | null;
    /**
     * 
     * @type {ObjectRef}
     * @memberof DatasetResource
     */
    managedBy: ObjectRef | null;
    /**
     * 
     * @type {string}
     * @memberof DatasetResource
     */
    dataTableViewState: string | null;
    /**
     * 
     * @type {ObjectRef}
     * @memberof DatasetResource
     */
    defaultDashboard: ObjectRef | null;
    /**
     * 
     * @type {ObjectRef}
     * @memberof DatasetResource
     */
    defaultInstanceDashboard: ObjectRef | null;
    /**
     * 
     * @type {boolean}
     * @memberof DatasetResource
     */
    isView: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof DatasetResource
     */
    isMonitor: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof DatasetResource
     */
    isMetricSMA: boolean;
    /**
     * 
     * @type {DatasetAccelerationType}
     * @memberof DatasetResource
     */
    accelerationType: DatasetAccelerationType;
    /**
     * 
     * @type {DatasetAccelerationInfo}
     * @memberof DatasetResource
     */
    accelerationInfo: DatasetAccelerationInfo;
    /**
     * 
     * @type {User}
     * @memberof DatasetResource
     */
    createdBy: User;
    /**
     * 
     * @type {User}
     * @memberof DatasetResource
     */
    updatedBy: User;
    /**
     * 
     * @type {string}
     * @memberof DatasetResource
     */
    createdAt: string;
    /**
     * 
     * @type {string}
     * @memberof DatasetResource
     */
    updatedAt: string;
    /**
     * 
     * @type {StorageIntegrationRef}
     * @memberof DatasetResource
     */
    readonly storageIntegration: StorageIntegrationRef | null;
    /**
     * The kind of definition that produces this dataset. Always populated;
     * classifies every dataset, including source datasets (datastreams /
     * external tables) and rows whose stored kind is empty or corrupt.
     * 
     * @type {DatasetDefinitionType}
     * @memberof DatasetResource
     */
    definitionType: DatasetDefinitionType;
    /**
     * Cosine similarity score (0–1). Only present when the `query` search
     * parameter is used (semantic search). Omitted for non-semantic list
     * requests.
     * 
     * @type {number}
     * @memberof DatasetResource
     */
    readonly score?: number;
}


/**
 * A reason explaining why a dataset's freshness is what it is.
 * ConfiguredFreshnessGoal: The data meets the freshness goal set for this dataset, but that goal is loose enough to allow this staleness; set a tighter goal for fresher data.
 * CreditManagerOverride: The acceleration credit manager raised the freshness goal to keep acceleration cost down.
 * SlowAcceleration: Acceleration can't keep up with the freshness goal; optimizing the dataset's query or reducing its data volume can help.
 * ActiveBackfill: A backfill is accelerating historical data, which can reduce freshness until it finishes.
 * DatasetHibernated: Ongoing acceleration is suspended because the dataset is hibernated; querying it resumes acceleration.
 * UnusedDatasetHibernating: The freshness goal was relaxed because the dataset hasn't been queried recently; querying it restores the configured goal.
 * 
 * @export
 * @enum {string}
 */
export enum DatasetStalenessReason {
    ConfiguredFreshnessGoal = 'ConfiguredFreshnessGoal',
    CreditManagerOverride = 'CreditManagerOverride',
    SlowAcceleration = 'SlowAcceleration',
    ActiveBackfill = 'ActiveBackfill',
    DatasetHibernated = 'DatasetHibernated',
    UnusedDatasetHibernating = 'UnusedDatasetHibernating'
}

/**
 * 
 * @export
 * @interface DatasetStatsMeta
 */
export interface DatasetStatsMeta {
    /**
     * Total number of datasets before applying filter
     * @type {number}
     * @memberof DatasetStatsMeta
     */
    totalDatasets: number;
    /**
     * Number of datasets after applying filter (equal to totalDatasets when no filter)
     * @type {number}
     * @memberof DatasetStatsMeta
     */
    filteredDatasets: number;
}
/**
 * Aggregated stats for requested dataset attributes
 * @export
 * @interface DatasetStatsResponse
 */
export interface DatasetStatsResponse {
    /**
     * One entry per requested `attributes` expression, in request
     * order. Empty array if `attributes` was empty in the request.
     * 
     * @type {Array<AttributeStats>}
     * @memberof DatasetStatsResponse
     */
    attributes: Array<AttributeStats>;
    /**
     * One entry per requested `multiValueAttributes` expression, in
     * request order. Empty array if `multiValueAttributes` was empty in
     * the request. Each entry's `count` values are total
     * occurrences across all matching datasets and may exceed
     * `meta.filteredDatasets`.
     * 
     * @type {Array<AttributeStats>}
     * @memberof DatasetStatsResponse
     */
    multiValueAttributes: Array<AttributeStats>;
    /**
     * 
     * @type {DatasetStatsMeta}
     * @memberof DatasetStatsResponse
     */
    meta: DatasetStatsMeta;
}
/**
 * 
 * @export
 * @interface DatasetTimeAlignment
 */
export interface DatasetTimeAlignment {
    /**
     * 
     * @type {string}
     * @memberof DatasetTimeAlignment
     */
    stepSizeNanoseconds: string;
    /**
     * 
     * @type {string}
     * @memberof DatasetTimeAlignment
     */
    offsetNanoseconds: string;
}
/**
 * 
 * @export
 * @enum {string}
 */
export enum DivergingColorScale {
    BrBg = 'BrBG',
    Prgn = 'PRGn',
    PiYg = 'PiYG',
    PuOr = 'PuOr',
    RdBu = 'RdBu',
    RdGy = 'RdGy',
    RdYlBu = 'RdYlBu',
    RdYlGn = 'RdYlGn',
    Spectral = 'Spectral'
}

/**
 * 
 * @export
 * @interface DivergingScaleMidpoint
 */
export interface DivergingScaleMidpoint {
    /**
     * 
     * @type {DivergingScaleMidpointType}
     * @memberof DivergingScaleMidpoint
     */
    type: DivergingScaleMidpointType;
    /**
     * 
     * @type {DivergingScaleMidpointPreset}
     * @memberof DivergingScaleMidpoint
     */
    preset?: DivergingScaleMidpointPreset;
    /**
     * Populated when `type` is `value`; absent otherwise.
     * @type {number}
     * @memberof DivergingScaleMidpoint
     */
    value?: number;
}


/**
 * Populated when `type` is `preset`; absent otherwise.
 * @export
 * @enum {string}
 */
export enum DivergingScaleMidpointPreset {
    Average = 'average',
    Zero = 'zero',
    MidpointLowerUpper = 'midpointLowerUpper'
}

/**
 * 
 * @export
 * @enum {string}
 */
export enum DivergingScaleMidpointType {
    Preset = 'preset',
    Value = 'value'
}

/**
 * 
 * @export
 * @interface DocumentationSearchRequest
 */
export interface DocumentationSearchRequest {
    /**
     * Natural-language search query.
     * @type {string}
     * @memberof DocumentationSearchRequest
     */
    query: string;
    /**
     * Maximum number of results to return.
     * @type {number}
     * @memberof DocumentationSearchRequest
     */
    limit?: number;
    /**
     * Minimum cosine similarity score. Results below this threshold are excluded.
     * @type {number}
     * @memberof DocumentationSearchRequest
     */
    minScore?: number;
}
/**
 * 
 * @export
 * @interface DocumentationSearchResponse
 */
export interface DocumentationSearchResponse {
    /**
     * 
     * @type {Array<DocumentationSearchResult>}
     * @memberof DocumentationSearchResponse
     */
    documentation: Array<DocumentationSearchResult>;
    /**
     * 
     * @type {Meta}
     * @memberof DocumentationSearchResponse
     */
    meta: Meta;
}
/**
 * 
 * @export
 * @interface DocumentationSearchResult
 */
export interface DocumentationSearchResult {
    /**
     * Chunk title, typically the source document or section name.
     * @type {string}
     * @memberof DocumentationSearchResult
     */
    title: string;
    /**
     * The chunk's text content.
     * @type {string}
     * @memberof DocumentationSearchResult
     */
    text: string;
    /**
     * Link to the full documentation page on docs.observeinc.com, or null if unavailable.
     * @type {string}
     * @memberof DocumentationSearchResult
     */
    url?: string | null;
}
/**
 * A link from a card to somewhere else — another dashboard, one of the
 * explorers, or an external URL — optionally carrying the card's time
 * range and parameter values across to the destination.
 * 
 * @export
 * @interface Drilldown
 */
export interface Drilldown {
    /**
     * 
     * @type {DrilldownTrigger}
     * @memberof Drilldown
     */
    trigger: DrilldownTrigger;
    /**
     * 
     * @type {LinkTarget}
     * @memberof Drilldown
     */
    target: LinkTarget;
    /**
     * Authored label for the link. Omit when unnamed; clients may fall
     * back to naming the destination (URL, dashboard name, explorer
     * dataset). Empty string is invalid — absence is omission.
     * 
     * @type {string}
     * @memberof Drilldown
     */
    name?: string;
    /**
     * 
     * @type {DrilldownTimeRange}
     * @memberof Drilldown
     */
    timeRange?: DrilldownTimeRange;
    /**
     * When `true`, explorer destinations also receive the source
     * document's current dataset-filter query params. Default `false`.
     * Omit when default.
     * 
     * @type {boolean}
     * @memberof Drilldown
     */
    includeFilteredDataset?: boolean;
    /**
     * Default `true`. Omit when default.
     * @type {boolean}
     * @memberof Drilldown
     */
    openInNewTab?: boolean;
    /**
     * 
     * @type {Array<DrilldownParameter>}
     * @memberof Drilldown
     */
    parameters?: Array<DrilldownParameter>;
}


/**
 * 
 * @export
 * @interface DrilldownParameter
 */
export interface DrilldownParameter {
    /**
     * 
     * @type {string}
     * @memberof DrilldownParameter
     */
    destinationName: string;
    /**
     * When `true` and source is `parameter` pointing to a
     * correlation tag parameter, the destination will receive
     * a `requiredTag-` prefixed query parameter. Default `false`.
     * Omit when default.
     * 
     * @type {boolean}
     * @memberof DrilldownParameter
     */
    isRequiredCorrelationTag?: boolean;
    /**
     * When `true`, generation serializes the mapping with a
     * `filter-<destinationName>=` query key instead of `tag-` /
     * `requiredTag-`. Used for column/resource filter mappings on
     * explorer destinations. Default `false`. Omit when default.
     * 
     * @type {boolean}
     * @memberof DrilldownParameter
     */
    isColumnFilter?: boolean;
    /**
     * 
     * @type {DrilldownSource}
     * @memberof DrilldownParameter
     */
    source: DrilldownSource;
}
/**
 * 
 * @export
 * @interface DrilldownSource
 */
export interface DrilldownSource {
    /**
     * 
     * @type {DrilldownSourceType}
     * @memberof DrilldownSource
     */
    type: DrilldownSourceType;
    /**
     * 
     * @type {DrilldownSourceParameter}
     * @memberof DrilldownSource
     */
    parameter?: DrilldownSourceParameter;
    /**
     * 
     * @type {DrilldownSourceGrouping}
     * @memberof DrilldownSource
     */
    grouping?: DrilldownSourceGrouping;
    /**
     * 
     * @type {DrilldownSourceCustom}
     * @memberof DrilldownSource
     */
    custom?: DrilldownSourceCustom;
    /**
     * 
     * @type {DrilldownSourceSelectionResource}
     * @memberof DrilldownSource
     */
    selectionResource?: DrilldownSourceSelectionResource;
    /**
     * 
     * @type {DrilldownSourceSelectionTag}
     * @memberof DrilldownSource
     */
    selectionTag?: DrilldownSourceSelectionTag;
}


/**
 * 
 * @export
 * @interface DrilldownSourceCustom
 */
export interface DrilldownSourceCustom {
    /**
     * 
     * @type {string}
     * @memberof DrilldownSourceCustom
     */
    value: string;
}
/**
 * 
 * @export
 * @interface DrilldownSourceGrouping
 */
export interface DrilldownSourceGrouping {
    /**
     * Column name (or dataset id for resource groupings).
     * @type {string}
     * @memberof DrilldownSourceGrouping
     */
    columnId: string;
}
/**
 * 
 * @export
 * @interface DrilldownSourceParameter
 */
export interface DrilldownSourceParameter {
    /**
     * Name of the source dashboard parameter.
     * @type {string}
     * @memberof DrilldownSourceParameter
     */
    sourceName: string;
}
/**
 * 
 * @export
 * @interface DrilldownSourceSelectionResource
 */
export interface DrilldownSourceSelectionResource {
    /**
     * 
     * @type {string}
     * @memberof DrilldownSourceSelectionResource
     */
    id: string;
    /**
     * 
     * @type {string}
     * @memberof DrilldownSourceSelectionResource
     */
    label?: string;
}
/**
 * 
 * @export
 * @interface DrilldownSourceSelectionTag
 */
export interface DrilldownSourceSelectionTag {
    /**
     * 
     * @type {string}
     * @memberof DrilldownSourceSelectionTag
     */
    tag: string;
}
/**
 * 
 * @export
 * @enum {string}
 */
export enum DrilldownSourceType {
    Parameter = 'parameter',
    Grouping = 'grouping',
    Custom = 'custom',
    SelectionResource = 'selection-resource',
    SelectionTag = 'selection-tag'
}

/**
 * Which time range the destination opens with. `current` (the default)
 * carries over the source card's selected range. `default` uses the
 * target dashboard's own default range. `none` sends no time range at
 * all. Omit when `current`.
 * 
 * @export
 * @enum {string}
 */
export enum DrilldownTimeRange {
    Current = 'current',
    Default = 'default',
    None = 'none'
}

/**
 * What the viewer interacts with to follow the link.
 * `card` — a link offered on the card itself.
 * `row`  — a drilldown from clicking a data point or table row.
 * 
 * @export
 * @enum {string}
 */
export enum DrilldownTrigger {
    Card = 'card',
    Row = 'row'
}

/**
 * 
 * @export
 * @interface ErrorMessage
 */
export interface ErrorMessage {
    /**
     * A stable, machine-readable identifier for the kind of error.
     * @type {string}
     * @memberof ErrorMessage
     */
    type: string;
    /**
     * Error message
     * @type {string}
     * @memberof ErrorMessage
     */
    message: string;
}
/**
 * 
 * @export
 * @interface ExportQueryRequest
 */
export interface ExportQueryRequest {
    /**
     * 
     * @type {ExportQueryRequestQuery}
     * @memberof ExportQueryRequest
     */
    query: ExportQueryRequestQuery;
    /**
     * The maximum number of rows to return. Defaults to 100,000, which is the maximum if paginate=false. If paginate=true rowCount can be up to the maximum value of int64 (9,223,372,036,854,775,807).
     * @type {string}
     * @memberof ExportQueryRequest
     */
    rowCount?: string;
    /**
     * 
     * @type {StagePresentationInput}
     * @memberof ExportQueryRequest
     */
    presentation?: StagePresentationInput;
}
/**
 * Encodes the actual OPAL query and its inputs.
 * @export
 * @interface ExportQueryRequestQuery
 */
export interface ExportQueryRequestQuery {
    /**
     * The name of the stage that will be used as output. Defaults to the last specified stage.
     * @type {string}
     * @memberof ExportQueryRequestQuery
     */
    outputStage?: string;
    /**
     * Describes one or more stage pipelines to execute. Stages can reference each other, but not in a cyclic fashion.
     * @type {Array<ExportQueryRequestQueryStagesInner>}
     * @memberof ExportQueryRequestQuery
     */
    stages: Array<ExportQueryRequestQueryStagesInner>;
    /**
     * Parameters defined for $variables (used for default values)
     * @type {Array<ParameterArrayInner>}
     * @memberof ExportQueryRequestQuery
     */
    parameters?: Array<ParameterArrayInner>;
    /**
     * Parameter values bound for $variables for this execution.
     * @type {Array<ParameterValueArrayInner>}
     * @memberof ExportQueryRequestQuery
     */
    parameterValues?: Array<ParameterValueArrayInner>;
}
/**
 * 
 * @export
 * @interface ExportQueryRequestQueryStagesInner
 */
export interface ExportQueryRequestQueryStagesInner {
    /**
     * Describes the @name bindings for input datasets or stages. The first input is provided as the default input to the pipeline.
     * @type {Array<InputDefinition>}
     * @memberof ExportQueryRequestQueryStagesInner
     */
    input: Array<InputDefinition>;
    /**
     * The ID to assign to this stage when binding as input to other datasets.
     * @type {string}
     * @memberof ExportQueryRequestQueryStagesInner
     */
    stageID: string;
    /**
     * The actual OPAL pipeline to execute. You can use embedded newlines,
     * or the pipe | character to separate verb clauses. You can include
     * embedded sub-queries, too.
     * 
     * @type {string}
     * @memberof ExportQueryRequestQueryStagesInner
     */
    pipeline: string;
    /**
     * Parameters defined for $variables (used for default values)
     * @type {Array<ParameterArrayInner>}
     * @memberof ExportQueryRequestQueryStagesInner
     */
    parameters?: Array<ParameterArrayInner>;
    /**
     * Parameter values bound for $variables for this execution.
     * @type {Array<ParameterValueArrayInner>}
     * @memberof ExportQueryRequestQueryStagesInner
     */
    parameterValues?: Array<ParameterValueArrayInner>;
}
/**
 * Reference to a column / field. The `column` variant is a plain
 * column id; the others cover nested paths, correlation tags,
 * link/resource source fields, and primary keys.
 * 
 * @export
 * @interface FieldRef
 */
export interface FieldRef {
    /**
     * 
     * @type {FieldRefType}
     * @memberof FieldRef
     */
    type: FieldRefType;
    /**
     * Column id. Populated when `type` is `column`; absent otherwise.
     * @type {string}
     * @memberof FieldRef
     */
    column?: string;
    /**
     * Populated when `type` is `nested`; absent otherwise.
     * @type {FieldRefNested}
     * @memberof FieldRef
     */
    nested?: FieldRefNested;
    /**
     * Populated when `type` is `tag`; absent otherwise.
     * @type {FieldRefTag}
     * @memberof FieldRef
     */
    tag?: FieldRefTag;
    /**
     * Populated when `type` is `link`; absent otherwise.
     * @type {FieldRefLink}
     * @memberof FieldRef
     */
    link?: FieldRefLink;
    /**
     * Populated when `type` is `primaryKey`; absent otherwise.
     * @type {FieldRefPrimaryKey}
     * @memberof FieldRef
     */
    primaryKey?: FieldRefPrimaryKey;
}


/**
 * A link/resource field composed of one or more source fields, with
 * an optional display label.
 * 
 * @export
 * @interface FieldRefLink
 */
export interface FieldRefLink {
    /**
     * 
     * @type {string}
     * @memberof FieldRefLink
     */
    label?: string;
    /**
     * 
     * @type {Array<FieldRefSrcField>}
     * @memberof FieldRefLink
     */
    srcFields: Array<FieldRefSrcField>;
}
/**
 * A field addressed by id and nested path.
 * @export
 * @interface FieldRefNested
 */
export interface FieldRefNested {
    /**
     * 
     * @type {string}
     * @memberof FieldRefNested
     */
    id: string;
    /**
     * 
     * @type {string}
     * @memberof FieldRefNested
     */
    path: string;
}
/**
 * A primary key composed of one or more source fields.
 * @export
 * @interface FieldRefPrimaryKey
 */
export interface FieldRefPrimaryKey {
    /**
     * 
     * @type {Array<FieldRefSrcField>}
     * @memberof FieldRefPrimaryKey
     */
    srcFields: Array<FieldRefSrcField>;
}
/**
 * 
 * @export
 * @interface FieldRefSrcField
 */
export interface FieldRefSrcField {
    /**
     * 
     * @type {FieldRefSrcFieldType}
     * @memberof FieldRefSrcField
     */
    type: FieldRefSrcFieldType;
    /**
     * Column id. Populated when `type` is `column`; absent otherwise.
     * @type {string}
     * @memberof FieldRefSrcField
     */
    column?: string;
    /**
     * Populated when `type` is `nested`; absent otherwise.
     * @type {FieldRefNested}
     * @memberof FieldRefSrcField
     */
    nested?: FieldRefNested;
}


/**
 * 
 * @export
 * @enum {string}
 */
export enum FieldRefSrcFieldType {
    Column = 'column',
    Nested = 'nested'
}

/**
 * A correlation-tag reference.
 * @export
 * @interface FieldRefTag
 */
export interface FieldRefTag {
    /**
     * 
     * @type {string}
     * @memberof FieldRefTag
     */
    tagId: string;
}
/**
 * 
 * @export
 * @enum {string}
 */
export enum FieldRefType {
    Column = 'column',
    Nested = 'nested',
    Tag = 'tag',
    Link = 'link',
    PrimaryKey = 'primaryKey'
}

/**
 * The filter operation. `operator` selects which variant body is
 * populated.
 * 
 * @export
 * @interface FilterPredicate
 */
export interface FilterPredicate {
    /**
     * 
     * @type {FilterPredicateOperator}
     * @memberof FilterPredicate
     */
    operator: FilterPredicateOperator;
    /**
     * 
     * @type {PredicateValues}
     * @memberof FilterPredicate
     */
    values?: PredicateValues;
    /**
     * 
     * @type {PredicateText}
     * @memberof FilterPredicate
     */
    text?: PredicateText;
    /**
     * 
     * @type {PredicateFilterCondition}
     * @memberof FilterPredicate
     */
    filterCondition?: PredicateFilterCondition;
    /**
     * 
     * @type {PredicateRange}
     * @memberof FilterPredicate
     */
    range?: PredicateRange;
    /**
     * 
     * @type {PredicateCidr}
     * @memberof FilterPredicate
     */
    cidr?: PredicateCidr;
    /**
     * 
     * @type {PredicateJsonValues}
     * @memberof FilterPredicate
     */
    jsonValues?: PredicateJsonValues;
    /**
     * 
     * @type {PredicateMultiColumn}
     * @memberof FilterPredicate
     */
    multiColumn?: PredicateMultiColumn;
    /**
     * 
     * @type {PredicateResourceInstance}
     * @memberof FilterPredicate
     */
    resourceInstance?: PredicateResourceInstance;
    /**
     * 
     * @type {PredicateParameter}
     * @memberof FilterPredicate
     */
    parameter?: PredicateParameter;
    /**
     * 
     * @type {PredicateTag}
     * @memberof FilterPredicate
     */
    tag?: PredicateTag;
    /**
     * 
     * @type {PredicateExists}
     * @memberof FilterPredicate
     */
    _exists?: PredicateExists;
    /**
     * 
     * @type {PredicatePattern}
     * @memberof FilterPredicate
     */
    pattern?: PredicatePattern;
}


/**
 * 
 * @export
 * @enum {string}
 */
export enum FilterPredicateOperator {
    Values = 'values',
    Text = 'text',
    Range = 'range',
    Cidr = 'cidr',
    JsonValues = 'jsonValues',
    MultiColumn = 'multiColumn',
    ResourceInstance = 'resourceInstance',
    Parameter = 'parameter',
    Tag = 'tag',
    Exists = 'exists',
    Pattern = 'pattern',
    FilterCondition = 'filterCondition'
}

/**
 * One filter rule: apply `predicate` to `column`, quantified by `verb`.
 * Set `enabled: false` to keep a rule in the document but leave it out of
 * the query.
 * 
 * @export
 * @interface FilterRule
 */
export interface FilterRule {
    /**
     * Target column. Absent for predicates that carry their own targets
     * (`multiColumn`, `resourceInstance`, `exists`) or that run globally
     * (a `text` match with no column).
     * 
     * @type {ColumnRef}
     * @memberof FilterRule
     */
    column?: ColumnRef;
    /**
     * 
     * @type {FilterVerb}
     * @memberof FilterRule
     */
    verb?: FilterVerb;
    /**
     * Default `true`. Omit when enabled.
     * @type {boolean}
     * @memberof FilterRule
     */
    enabled?: boolean;
    /**
     * 
     * @type {FilterPredicate}
     * @memberof FilterRule
     */
    predicate: FilterPredicate;
}


/**
 * How the predicate is quantified over time. The default, `filter`, keeps
 * individual matching rows and is what event data normally wants. The
 * other verbs quantify the predicate over each interval or resource
 * lifetime, keeping a whole interval or not at all:
 *   - filter     — keep each matching row (default)
 *   - ever       — the predicate matched at least once during the interval
 *   - always     — the predicate matched for the entire interval
 *   - never      — the predicate never matched during the interval
 *   - filterLast — the predicate matched at the interval's latest point
 * Omit for `filter`.
 * 
 * @export
 * @enum {string}
 */
export enum FilterVerb {
    Filter = 'filter',
    Ever = 'ever',
    Always = 'always',
    Never = 'never',
    FilterLast = 'filterLast'
}

/**
 * A time range, expressed in one of three ways. `kind` selects which of
 * `preset`, `relative`, or `absolute` is present; the other two are
 * absent.
 *   Preset:   `{ "kind": "preset", "preset": { "presetType": "PAST_15_MINUTES" } }`
 *   Relative: `{ "kind": "relative", "relative": { "millisFromCurrentTime": 900000 } }`
 *   Absolute: `{ "kind": "absolute", "absolute": { "startTime": "2024-04-30T00:00:00.000Z", "endTime": "2024-05-01T00:00:00.000Z" } }`
 * Known preset types include:
 *   PAST_5_MINUTES, PAST_10_MINUTES, PAST_15_MINUTES,
 *   PAST_30_MINUTES, PAST_60_MINUTES, PAST_2_HOURS,
 *   PAST_4_HOURS, PAST_6_HOURS, PAST_12_HOURS,
 *   PAST_24_HOURS, PAST_2_DAYS, PAST_3_DAYS, PAST_4_DAYS,
 *   PAST_7_DAYS, PAST_14_DAYS, PAST_30_DAYS,
 *   TODAY, YESTERDAY, THIS_DAY_LAST_WEEK, LAST_WEEK, LAST_MONTH.
 * For presets, `millisFromCurrentTime` is derivable and is not stored.
 * 
 * @export
 * @interface FrontendTimeRange
 */
export interface FrontendTimeRange {
    /**
     * 
     * @type {FrontendTimeRangeKind}
     * @memberof FrontendTimeRange
     */
    kind: FrontendTimeRangeKind;
    /**
     * Populated when `kind` is `preset`; absent otherwise.
     * @type {FrontendTimeRangePreset}
     * @memberof FrontendTimeRange
     */
    preset?: FrontendTimeRangePreset;
    /**
     * Populated when `kind` is `relative`; absent otherwise.
     * @type {FrontendTimeRangeRelative}
     * @memberof FrontendTimeRange
     */
    relative?: FrontendTimeRangeRelative;
    /**
     * Populated when `kind` is `absolute`; absent otherwise.
     * @type {FrontendTimeRangeAbsolute}
     * @memberof FrontendTimeRange
     */
    absolute?: FrontendTimeRangeAbsolute;
}


/**
 * 
 * @export
 * @interface FrontendTimeRangeAbsolute
 */
export interface FrontendTimeRangeAbsolute {
    /**
     * Window start, as a UTC RFC 3339 timestamp.
     * @type {string}
     * @memberof FrontendTimeRangeAbsolute
     */
    startTime: string;
    /**
     * Window end, as a UTC RFC 3339 timestamp.
     * @type {string}
     * @memberof FrontendTimeRangeAbsolute
     */
    endTime: string;
}
/**
 * 
 * @export
 * @enum {string}
 */
export enum FrontendTimeRangeKind {
    Preset = 'preset',
    Relative = 'relative',
    Absolute = 'absolute'
}

/**
 * 
 * @export
 * @interface FrontendTimeRangePreset
 */
export interface FrontendTimeRangePreset {
    /**
     * Named Observe preset. Not a closed enum so newly added
     * presets can round-trip without a schema bump.
     * 
     * @type {string}
     * @memberof FrontendTimeRangePreset
     */
    presetType: string;
}
/**
 * 
 * @export
 * @interface FrontendTimeRangeRelative
 */
export interface FrontendTimeRangeRelative {
    /**
     * Custom relative window length in milliseconds.
     * @type {number}
     * @memberof FrontendTimeRangeRelative
     */
    millisFromCurrentTime: number;
}
/**
 * 
 * @export
 * @interface GenerateAPITokenRequest
 */
export interface GenerateAPITokenRequest {
    /**
     * The email address of the user to mint credentials for.
     * @type {string}
     * @memberof GenerateAPITokenRequest
     */
    userEmail: string;
    /**
     * The password of the user minting credentials.
     * @type {string}
     * @memberof GenerateAPITokenRequest
     */
    userPassword: string;
    /**
     * Optional name of the token, to remember what it is for.
     * @type {string}
     * @memberof GenerateAPITokenRequest
     */
    tokenName?: string;
}
/**
 * A card's placement within its section's grid, measured from the
 * section's top-left corner. `x` and `w` are in grid columns (the
 * grid is 12 columns wide); `y` and `h` are in grid rows.
 * 
 * @export
 * @interface Geometry
 */
export interface Geometry {
    /**
     * 
     * @type {number}
     * @memberof Geometry
     */
    x: number;
    /**
     * 
     * @type {number}
     * @memberof Geometry
     */
    y: number;
    /**
     * 
     * @type {number}
     * @memberof Geometry
     */
    w: number;
    /**
     * 
     * @type {number}
     * @memberof Geometry
     */
    h: number;
}
/**
 * 
 * @export
 * @interface GetDatasetById200Response
 */
export interface GetDatasetById200Response {
    /**
     * 
     * @type {boolean}
     * @memberof GetDatasetById200Response
     */
    ok?: boolean;
    /**
     * 
     * @type {DatasetLegacyResource}
     * @memberof GetDatasetById200Response
     */
    data?: DatasetLegacyResource;
}
/**
 * 
 * @export
 * @interface HeatmapOptions
 */
export interface HeatmapOptions {
    /**
     * 
     * @type {FieldRef}
     * @memberof HeatmapOptions
     */
    fieldValue?: FieldRef;
    /**
     * 
     * @type {boolean}
     * @memberof HeatmapOptions
     */
    autobinTemporalAxis?: boolean;
    /**
     * 
     * @type {number}
     * @memberof HeatmapOptions
     */
    xBinSize?: number;
    /**
     * 
     * @type {number}
     * @memberof HeatmapOptions
     */
    yBinSize?: number;
    /**
     * 
     * @type {boolean}
     * @memberof HeatmapOptions
     */
    useLogColorScale?: boolean;
    /**
     * 
     * @type {SequentialColorScale}
     * @memberof HeatmapOptions
     */
    colorScale?: SequentialColorScale;
    /**
     * 
     * @type {boolean}
     * @memberof HeatmapOptions
     */
    useReverseColorScale?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof HeatmapOptions
     */
    showValueText?: boolean;
    /**
     * Vega-Lite non-arg aggregate op (e.g. "count", "sum", "mean").
     * @type {string}
     * @memberof HeatmapOptions
     */
    aggregate?: string;
    /**
     * 
     * @type {AxisConfig}
     * @memberof HeatmapOptions
     */
    valueFormattingConfig?: AxisConfig;
    /**
     * An escape hatch for visualization settings that do not yet have
     * a typed field of their own. Contents are stored and returned
     * unchanged and are not validated, so newer clients can round-trip
     * settings this version of the schema does not name.
     * 
     * @type {{ [key: string]: any | undefined; }}
     * @memberof HeatmapOptions
     */
    extensions?: { [key: string]: any | undefined; };
}


/**
 * A static image card. Renders the image at `url` inside the
 * card's grid placement.
 * 
 * @export
 * @interface ImageCard
 */
export interface ImageCard {
    /**
     * 
     * @type {string}
     * @memberof ImageCard
     */
    title?: string;
    /**
     * Image source URL.
     * @type {string}
     * @memberof ImageCard
     */
    url?: string;
    /**
     * When `true`, the image stretches to fill the card. Default
     * `false`. Omit when default.
     * 
     * @type {boolean}
     * @memberof ImageCard
     */
    stretch?: boolean;
    /**
     * 
     * @type {ImageCardResizeBehavior}
     * @memberof ImageCard
     */
    resizeBehavior?: ImageCardResizeBehavior;
    /**
     * CSS color painted behind the image (letterboxing).
     * @type {string}
     * @memberof ImageCard
     */
    backgroundFillColor?: string;
}


/**
 * How the image is fitted within the card bounds.
 * @export
 * @enum {string}
 */
export enum ImageCardResizeBehavior {
    Height = 'height',
    Width = 'width',
    Fill = 'fill',
    Contain = 'contain'
}

/**
 * 
 * @export
 * @interface IncludeExcludeValuesInner
 */
export interface IncludeExcludeValuesInner {
    /**
     * 
     * @type {string}
     * @memberof IncludeExcludeValuesInner
     */
    value: string | null;
    /**
     * 
     * @type {boolean}
     * @memberof IncludeExcludeValuesInner
     */
    exclude: boolean;
}
/**
 * A single compiler error from compiling the OPAL pipeline.
 * @export
 * @interface IngestFiltersCompilerError
 */
export interface IngestFiltersCompilerError {
    /**
     * Stable identifier for the kind of compiler error.
     * @type {string}
     * @memberof IngestFiltersCompilerError
     */
    type: string;
    /**
     * Human-readable explanation of the error.
     * @type {string}
     * @memberof IngestFiltersCompilerError
     */
    message: string;
    /**
     * Location of the error within the pipeline text. Absent when the compiler could not attribute the error to a specific position.
     * @type {IngestFiltersCompilerErrorSpan}
     * @memberof IngestFiltersCompilerError
     */
    span?: IngestFiltersCompilerErrorSpan;
}
/**
 * A single position within the pipeline text.
 * @export
 * @interface IngestFiltersCompilerErrorPos
 */
export interface IngestFiltersCompilerErrorPos {
    /**
     * Line number, starting at 1.
     * @type {number}
     * @memberof IngestFiltersCompilerErrorPos
     */
    row?: number;
    /**
     * Column number within the line, starting at 1.
     * @type {number}
     * @memberof IngestFiltersCompilerErrorPos
     */
    col?: number;
}
/**
 * A half-open range within the pipeline text, from `start` up to `end`.
 * @export
 * @interface IngestFiltersCompilerErrorSpan
 */
export interface IngestFiltersCompilerErrorSpan {
    /**
     * First position covered by the error.
     * @type {IngestFiltersCompilerErrorPos}
     * @memberof IngestFiltersCompilerErrorSpan
     */
    start?: IngestFiltersCompilerErrorPos;
    /**
     * Position just past the last one covered by the error.
     * @type {IngestFiltersCompilerErrorPos}
     * @memberof IngestFiltersCompilerErrorSpan
     */
    end?: IngestFiltersCompilerErrorPos;
}
/**
 * Fields for a new drop filter.
 * @export
 * @interface IngestFiltersCreateRequest
 */
export interface IngestFiltersCreateRequest {
    /**
     * Display name of the filter.
     * @type {string}
     * @memberof IngestFiltersCreateRequest
     */
    label: string;
    /**
     * Optional human-readable description.
     * @type {string}
     * @memberof IngestFiltersCreateRequest
     */
    description?: string;
    /**
     * Optional icon shown alongside the filter in the UI.
     * @type {string}
     * @memberof IngestFiltersCreateRequest
     */
    iconUrl?: string;
    /**
     * Source dataset reference. Only the `id` is consumed; any `record` payload is ignored. Cannot be changed after creation.
     * @type {DatasetRef}
     * @memberof IngestFiltersCreateRequest
     */
    sourceDataset: DatasetRef;
    /**
     * OPAL pipeline expression defining the filter predicate. Observations matching the pipeline are candidates for dropping, subject to `dropRate`.
     * @type {string}
     * @memberof IngestFiltersCreateRequest
     */
    pipeline: string;
    /**
     * Reserved for UI state. Stored and returned verbatim, never interpreted by Observe. Safe to omit.
     * @type {object}
     * @memberof IngestFiltersCreateRequest
     */
    layout?: object;
    /**
     * Fraction (0.0-1.0) of matching observations to drop. 1.0 = drop all matches; 0.0 = drop none. Default 1.0 when omitted.
     * @type {number}
     * @memberof IngestFiltersCreateRequest
     */
    dropRate?: number;
    /**
     * Whether the filter starts actively dropping observations. Default true when omitted.
     * @type {boolean}
     * @memberof IngestFiltersCreateRequest
     */
    enabled?: boolean;
}
/**
 * A page of datasets eligible for drop filtering.
 * @export
 * @interface IngestFiltersFilterableDatasetsResponse
 */
export interface IngestFiltersFilterableDatasetsResponse {
    /**
     * The eligible source datasets in this page.
     * @type {Array<DatasetRef>}
     * @memberof IngestFiltersFilterableDatasetsResponse
     */
    datasets: Array<DatasetRef>;
    /**
     * Pagination metadata, including the total dataset count.
     * @type {Meta}
     * @memberof IngestFiltersFilterableDatasetsResponse
     */
    meta: Meta;
}
/**
 * A page of drop filters.
 * @export
 * @interface IngestFiltersListResponse
 */
export interface IngestFiltersListResponse {
    /**
     * The drop filters in this page, in the requested order.
     * @type {Array<IngestFiltersResource>}
     * @memberof IngestFiltersListResponse
     */
    ingestFilters: Array<IngestFiltersResource>;
    /**
     * Pagination metadata, including the total filter count.
     * @type {Meta}
     * @memberof IngestFiltersListResponse
     */
    meta: Meta;
}
/**
 * A drop filter resource.
 * @export
 * @interface IngestFiltersResource
 */
export interface IngestFiltersResource {
    /**
     * Unique, immutable identifier of the filter.
     * @type {string}
     * @memberof IngestFiltersResource
     */
    readonly id: string;
    /**
     * Mutable display name of the filter.
     * @type {string}
     * @memberof IngestFiltersResource
     */
    label: string;
    /**
     * Optional human-readable description.
     * @type {string}
     * @memberof IngestFiltersResource
     */
    description: string | null;
    /**
     * Optional icon shown alongside the filter in the UI.
     * @type {string}
     * @memberof IngestFiltersResource
     */
    iconUrl: string | null;
    /**
     * The source dataset this filter applies to. Cannot be changed after creation.
     * @type {DatasetRef}
     * @memberof IngestFiltersResource
     */
    sourceDataset: DatasetRef;
    /**
     * OPAL pipeline expression defining the filter predicate. Observations matching the pipeline are candidates for dropping, subject to `dropRate`.
     * @type {string}
     * @memberof IngestFiltersResource
     */
    pipeline: string;
    /**
     * Reserved for UI state. Stored and returned verbatim, never interpreted by Observe. Safe to omit.
     * @type {object}
     * @memberof IngestFiltersResource
     */
    layout: object | null;
    /**
     * Fraction (0.0-1.0) of matching observations to drop. 1.0 = drop all matches; 0.0 = drop none.
     * @type {number}
     * @memberof IngestFiltersResource
     */
    dropRate: number;
    /**
     * Whether the filter is actively dropping observations. Disabled filters are retained but have no effect on ingest.
     * @type {boolean}
     * @memberof IngestFiltersResource
     */
    enabled: boolean;
    /**
     * 
     * @type {ObjectRef}
     * @memberof IngestFiltersResource
     */
    readonly managedBy: ObjectRef | null;
    /**
     * User who created the filter.
     * @type {User}
     * @memberof IngestFiltersResource
     */
    readonly createdBy: User;
    /**
     * When the filter was created.
     * @type {string}
     * @memberof IngestFiltersResource
     */
    readonly createdAt: string;
    /**
     * User who most recently updated the filter.
     * @type {User}
     * @memberof IngestFiltersResource
     */
    readonly updatedBy: User;
    /**
     * When the filter was last updated.
     * @type {string}
     * @memberof IngestFiltersResource
     */
    readonly updatedAt: string;
}
/**
 * Merge-patch payload (RFC 7396). Only fields explicitly present are updated; omitted fields keep their current value. `description`, `iconUrl`, and `layout` accept an explicit `null` to clear them. `label`, `pipeline`, `dropRate`, and `enabled` are not nullable — sending `null` for any of those is rejected with a 400.
 * @export
 * @interface IngestFiltersUpdateRequest
 */
export interface IngestFiltersUpdateRequest {
    /**
     * Display name of the filter.
     * @type {string}
     * @memberof IngestFiltersUpdateRequest
     */
    label?: string;
    /**
     * Optional human-readable description. `null` clears it.
     * @type {string}
     * @memberof IngestFiltersUpdateRequest
     */
    description?: string | null;
    /**
     * Optional icon shown in the UI. `null` clears it.
     * @type {string}
     * @memberof IngestFiltersUpdateRequest
     */
    iconUrl?: string | null;
    /**
     * OPAL pipeline expression defining the filter predicate. Compiled against the source dataset's schema; compilation failure returns a 400.
     * @type {string}
     * @memberof IngestFiltersUpdateRequest
     */
    pipeline?: string;
    /**
     * Reserved for UI state, never interpreted by Observe. `null` clears it.
     * @type {object}
     * @memberof IngestFiltersUpdateRequest
     */
    layout?: object | null;
    /**
     * Fraction (0.0-1.0) of matching observations to drop. 1.0 = drop all matches; 0.0 = drop none.
     * @type {number}
     * @memberof IngestFiltersUpdateRequest
     */
    dropRate?: number;
    /**
     * Whether the filter is actively dropping observations. Send this field alone to enable or disable an existing filter.
     * @type {boolean}
     * @memberof IngestFiltersUpdateRequest
     */
    enabled?: boolean;
}
/**
 * A pipeline to compile, plus the dataset whose schema it compiles against.
 * @export
 * @interface IngestFiltersValidateRequest
 */
export interface IngestFiltersValidateRequest {
    /**
     * OPAL pipeline expression to compile.
     * @type {string}
     * @memberof IngestFiltersValidateRequest
     */
    pipeline: string;
    /**
     * Source dataset reference. Only the `id` is consumed; any `record` payload is ignored.
     * @type {DatasetRef}
     * @memberof IngestFiltersValidateRequest
     */
    sourceDataset: DatasetRef;
}
/**
 * Result of compiling the pipeline. A 200 does not mean the pipeline is valid: check that `errors` is empty.
 * @export
 * @interface IngestFiltersValidateResponse
 */
export interface IngestFiltersValidateResponse {
    /**
     * Compiler errors, in source order. Empty when the pipeline compiled successfully.
     * @type {Array<IngestFiltersCompilerError>}
     * @memberof IngestFiltersValidateResponse
     */
    errors: Array<IngestFiltersCompilerError>;
}
/**
 * A new route is created **disabled**, and is ignored by the ingest pipeline until you enable it with a PATCH. The one exception is the default route, which is always enabled.
 * 
 * A new route is assigned the lowest priority among non-default routes, so it is evaluated last. Use `PATCH /v1/ingest/routes/{type}` to reorder.
 * 
 * Creating the first route for a type also creates that type's default route automatically, so that no observation is left unrouted.
 * @export
 * @interface IngestRoutesCreateRequest
 */
export interface IngestRoutesCreateRequest {
    /**
     * OPAL expression acting as the match predicate for this route, compiled against the destination dataset's schema. A compile error is rejected with a 400.
     * 
     * Pass an empty string to create the type's default route, the catch-all evaluated after every other route. Once a default route exists, an empty pipeline is rejected with a 400.
     * 
     * Two restrictions apply per type:
     * 
     * - `oteltraces` supports only the default route. A non-empty pipeline is rejected with a 400.
     * - Some types restrict which columns the expression may reference: `prometheus`, `k8sentity`, and `oteltraces` allow only `meta`; `otelmetrics` allows `meta` and `metric`. `otellogs` and `any` are unrestricted. Referencing any other column is rejected with a 400.
     * 
     * Unlike a drop filter, a route predicate that fails at evaluation time fails the whole bundle rather than failing open. Expressions are therefore rejected at creation if they reference columns that cannot be resolved.
     * @type {string}
     * @memberof IngestRoutesCreateRequest
     */
    pipeline: string;
    /**
     * Opaque JSON blob round-tripped to the frontend; not interpreted by the server.
     * @type {object}
     * @memberof IngestRoutesCreateRequest
     */
    layout?: object;
    /**
     * Primary destination dataset ID. Must be a source dataset whose type matches the `type` path parameter.
     * @type {string}
     * @memberof IngestRoutesCreateRequest
     */
    destinationId: string;
    /**
     * Optional secondary destination dataset ID, subject to the same type check as `destinationId`. When set, matching observations are written to both destinations. Omit to leave unset; use PATCH with an explicit `null` to clear it later.
     * @type {string}
     * @memberof IngestRoutesCreateRequest
     */
    secondaryDestinationId?: string;
}
/**
 * All ingest routes for a type, in priority order.
 * @export
 * @interface IngestRoutesListResponse
 */
export interface IngestRoutesListResponse {
    /**
     * The routes, ordered by descending priority. The type's default route is always last.
     * @type {Array<IngestRoutesResource>}
     * @memberof IngestRoutesListResponse
     */
    ingestRoutes: Array<IngestRoutesResource>;
    /**
     * Result metadata. `totalCount` is the number of routes for the type. This endpoint is not paginated, so it always equals the length of `ingestRoutes`.
     * @type {Meta}
     * @memberof IngestRoutesListResponse
     */
    meta: Meta;
}
/**
 * An ingest route resource. This is one rule defining a route for observations of a certain type.
 * @export
 * @interface IngestRoutesResource
 */
export interface IngestRoutesResource {
    /**
     * Unique identifier for this ingest route.
     * @type {string}
     * @memberof IngestRoutesResource
     */
    readonly id: string;
    /**
     * User who created this route. Always returned as an ID-only object; pass expand=true to populate `record`.
     * @type {User}
     * @memberof IngestRoutesResource
     */
    readonly createdBy: User;
    /**
     * Time at which this route was created.
     * @type {string}
     * @memberof IngestRoutesResource
     */
    readonly createdAt: string;
    /**
     * User who last updated this route. Always returned as an ID-only object; pass expand=true to populate `record`.
     * @type {User}
     * @memberof IngestRoutesResource
     */
    readonly updatedBy: User;
    /**
     * Time at which this route was last updated.
     * @type {string}
     * @memberof IngestRoutesResource
     */
    readonly updatedAt: string;
    /**
     * The observation type this route applies to. Set at creation and cannot be changed.
     * @type {IngestRoutesType}
     * @memberof IngestRoutesResource
     */
    readonly type: IngestRoutesType;
    /**
     * OPAL expression acting as the match predicate for this route. An observation is routed here when the expression evaluates true. Compiled against the schema of the destination source dataset.
     * 
     * An empty string identifies the type's default route, which matches every observation not matched by a higher-priority route. See the `pipeline` field on the create request for the restrictions that apply per type.
     * @type {string}
     * @memberof IngestRoutesResource
     */
    readonly pipeline: string;
    /**
     * Opaque JSON blob round-tripped to the frontend; not interpreted by the server.
     * @type {object}
     * @memberof IngestRoutesResource
     */
    readonly layout: object;
    /**
     * Primary destination dataset ID. Observations matching this route are written here.
     * @type {string}
     * @memberof IngestRoutesResource
     */
    readonly destinationId: string;
    /**
     * Secondary destination dataset ID. When set, observations matching this route are duplicated to both the primary and secondary destination datasets.
     * @type {string}
     * @memberof IngestRoutesResource
     */
    readonly secondaryDestinationId: string | null;
    /**
     * Whether this route is evaluated against incoming data. A disabled route is skipped entirely, as though it did not exist. New routes are created disabled; see the create request for details.
     * @type {boolean}
     * @memberof IngestRoutesResource
     */
    readonly enabled: boolean;
    /**
     * 
     * @type {ObjectRef}
     * @memberof IngestRoutesResource
     */
    readonly managedBy: ObjectRef | null;
}


/**
 * The observation type a route applies to. Each type corresponds to a source dataset schema and to the ingest endpoints that emit compatible data. `any` is the generic schema with `FIELDS` and `EXTRA` columns; the rest are direct-write source datasets. See the `type` path parameter for the endpoint mappings.
 * @export
 * @enum {string}
 */
export enum IngestRoutesType {
    Otellogs = 'otellogs',
    Otelmetrics = 'otelmetrics',
    Oteltraces = 'oteltraces',
    Prometheus = 'prometheus',
    K8sentity = 'k8sentity',
    Any = 'any'
}

/**
 * New priority order for every route of a type. Reordering is a whole-list operation; there is no way to move a single route.
 * @export
 * @interface IngestRoutesUpdatePriorityRequest
 */
export interface IngestRoutesUpdatePriorityRequest {
    /**
     * Route IDs in the desired priority order, highest priority first. Must contain every route ID for the type exactly once.
     * @type {Array<string>}
     * @memberof IngestRoutesUpdatePriorityRequest
     */
    ordering: Array<string>;
}
/**
 * Merge-patch payload (RFC 7396). Only fields explicitly present are updated; omitted fields keep their current value. Priority is not settable here — use `PATCH /v1/ingest/routes/{type}` to reorder.
 * 
 * `secondaryDestinationId` accepts an explicit `null` to clear it.
 * @export
 * @interface IngestRoutesUpdateRequest
 */
export interface IngestRoutesUpdateRequest {
    /**
     * Replacement OPAL match predicate, subject to the same compilation and per-type restrictions as on create.
     * @type {string}
     * @memberof IngestRoutesUpdateRequest
     */
    pipeline?: string;
    /**
     * Opaque JSON blob round-tripped to the frontend; not interpreted by the server. Ignored for a type's default route.
     * @type {object}
     * @memberof IngestRoutesUpdateRequest
     */
    layout?: object;
    /**
     * Replacement primary destination dataset ID. Must be a source dataset whose type matches the route's type.
     * @type {string}
     * @memberof IngestRoutesUpdateRequest
     */
    destinationId?: string;
    /**
     * Replacement secondary destination dataset ID, subject to the same type check. Pass `null` to remove the secondary destination.
     * @type {string}
     * @memberof IngestRoutesUpdateRequest
     */
    secondaryDestinationId?: string | null;
    /**
     * Set true to start evaluating this route against incoming data. New routes are created disabled, so this is the call that puts a route into service.
     * @type {boolean}
     * @memberof IngestRoutesUpdateRequest
     */
    enabled?: boolean;
}
/**
 * 
 * @export
 * @interface IngestTokenCreateRequest
 */
export interface IngestTokenCreateRequest {
    /**
     * Optional. Auto-generated from a timestamp if omitted. Must be unique per customer; max 127 bytes.
     * @type {string}
     * @memberof IngestTokenCreateRequest
     */
    name?: string;
    /**
     * Optional. Max 255 bytes. `null` is stored as an empty string.
     * @type {string}
     * @memberof IngestTokenCreateRequest
     */
    description?: string | null;
}
/**
 * The newly created ingest token. Same shape as IngestToken-Resource, but the one-time `secret` is always present here — it is returned only in this response and can never be read back.
 * @export
 * @interface IngestTokenCreateResponse
 */
export interface IngestTokenCreateResponse {
    /**
     * Stable token id (the `ds1...` string).
     * @type {string}
     * @memberof IngestTokenCreateResponse
     */
    id: string;
    /**
     * Mutable display name. Unique per customer.
     * @type {string}
     * @memberof IngestTokenCreateResponse
     */
    name: string;
    /**
     * 
     * @type {string}
     * @memberof IngestTokenCreateResponse
     */
    description: string;
    /**
     * 
     * @type {boolean}
     * @memberof IngestTokenCreateResponse
     */
    disabled: boolean;
    /**
     * 
     * @type {User}
     * @memberof IngestTokenCreateResponse
     */
    createdBy: User;
    /**
     * 
     * @type {string}
     * @memberof IngestTokenCreateResponse
     */
    createdAt: string;
    /**
     * 
     * @type {User}
     * @memberof IngestTokenCreateResponse
     */
    updatedBy: User;
    /**
     * 
     * @type {string}
     * @memberof IngestTokenCreateResponse
     */
    updatedAt: string;
    /**
     * Ingest health metrics. Populated only when `?expand=true`, and only on GET /v1/ingest/tokens/{id} and the list endpoint (never returned by create or update). A token that has not yet ingested any data has no metrics to report, so the field is omitted until the token is first used.
     * @type {IngestTokenStats}
     * @memberof IngestTokenCreateResponse
     */
    stats?: IngestTokenStats;
    /**
     * Token secret. Returned exactly once, on create; never readable again.
     * @type {string}
     * @memberof IngestTokenCreateResponse
     */
    secret: string;
}
/**
 * 
 * @export
 * @interface IngestTokenListResponse
 */
export interface IngestTokenListResponse {
    /**
     * 
     * @type {Array<IngestTokenResource>}
     * @memberof IngestTokenListResponse
     */
    tokens: Array<IngestTokenResource>;
    /**
     * 
     * @type {Meta}
     * @memberof IngestTokenListResponse
     */
    meta: Meta;
}
/**
 * 
 * @export
 * @interface IngestTokenResource
 */
export interface IngestTokenResource {
    /**
     * Stable token id (the `ds1...` string).
     * @type {string}
     * @memberof IngestTokenResource
     */
    id: string;
    /**
     * Mutable display name. Unique per customer.
     * @type {string}
     * @memberof IngestTokenResource
     */
    name: string;
    /**
     * 
     * @type {string}
     * @memberof IngestTokenResource
     */
    description: string;
    /**
     * 
     * @type {boolean}
     * @memberof IngestTokenResource
     */
    disabled: boolean;
    /**
     * 
     * @type {User}
     * @memberof IngestTokenResource
     */
    createdBy: User;
    /**
     * 
     * @type {string}
     * @memberof IngestTokenResource
     */
    createdAt: string;
    /**
     * 
     * @type {User}
     * @memberof IngestTokenResource
     */
    updatedBy: User;
    /**
     * 
     * @type {string}
     * @memberof IngestTokenResource
     */
    updatedAt: string;
    /**
     * Ingest health metrics. Populated only when `?expand=true`, and only on GET /v1/ingest/tokens/{id} and the list endpoint (never returned by create or update). A token that has not yet ingested any data has no metrics to report, so the field is omitted until the token is first used.
     * @type {IngestTokenStats}
     * @memberof IngestTokenResource
     */
    stats?: IngestTokenStats;
}
/**
 * 
 * @export
 * @interface IngestTokenStats
 */
export interface IngestTokenStats {
    /**
     * 
     * @type {string}
     * @memberof IngestTokenStats
     */
    firstUsed: string;
    /**
     * 
     * @type {string}
     * @memberof IngestTokenStats
     */
    lastUsed: string;
    /**
     * 
     * @type {string}
     * @memberof IngestTokenStats
     */
    lastError?: string | null;
    /**
     * 
     * @type {string}
     * @memberof IngestTokenStats
     */
    firstIngest: string;
    /**
     * 
     * @type {string}
     * @memberof IngestTokenStats
     */
    lastIngest: string;
    /**
     * 
     * @type {Array<IngestTokenStatsError>}
     * @memberof IngestTokenStats
     */
    errors: Array<IngestTokenStatsError>;
    /**
     * 
     * @type {Array<IngestTokenStatsTimeSeriesValue>}
     * @memberof IngestTokenStats
     */
    observations: Array<IngestTokenStatsTimeSeriesValue>;
    /**
     * 
     * @type {Array<IngestTokenStatsTimeSeriesValue>}
     * @memberof IngestTokenStats
     */
    volumeBytes: Array<IngestTokenStatsTimeSeriesValue>;
}
/**
 * 
 * @export
 * @interface IngestTokenStatsError
 */
export interface IngestTokenStatsError {
    /**
     * 
     * @type {string}
     * @memberof IngestTokenStatsError
     */
    time: string;
    /**
     * 
     * @type {string}
     * @memberof IngestTokenStatsError
     */
    message: string;
    /**
     * 
     * @type {number}
     * @memberof IngestTokenStatsError
     */
    code?: number;
}
/**
 * 
 * @export
 * @interface IngestTokenStatsTimeSeriesValue
 */
export interface IngestTokenStatsTimeSeriesValue {
    /**
     * 
     * @type {string}
     * @memberof IngestTokenStatsTimeSeriesValue
     */
    time: string;
    /**
     * 
     * @type {number}
     * @memberof IngestTokenStatsTimeSeriesValue
     */
    value: number;
}
/**
 * 
 * @export
 * @interface IngestTokenUpdateRequest
 */
export interface IngestTokenUpdateRequest {
    /**
     * New name. Must be unique per customer; max 127 bytes.
     * @type {string}
     * @memberof IngestTokenUpdateRequest
     */
    name?: string;
    /**
     * New description. Max 255 bytes. `null` resets it to an empty string.
     * @type {string}
     * @memberof IngestTokenUpdateRequest
     */
    description?: string | null;
    /**
     * 
     * @type {boolean}
     * @memberof IngestTokenUpdateRequest
     */
    disabled?: boolean;
}
/**
 * A named data source for a card's pipeline, bound in OPAL as `@name`.
 * The data itself can come from a dataset, another card's result, or the
 * document's dataset filter.
 * 
 * @export
 * @interface Input
 */
export interface Input {
    /**
     * 
     * @type {string}
     * @memberof Input
     */
    name: string;
    /**
     * 
     * @type {InputRole}
     * @memberof Input
     */
    role?: InputRole;
    /**
     * Whether a user added this input explicitly, rather than it being
     * generated from the pipeline. Editor state only — it does not
     * affect how the query runs. Default `false`; omit for generated
     * inputs.
     * 
     * @type {boolean}
     * @memberof Input
     */
    isUserInput?: boolean;
    /**
     * 
     * @type {InputSource}
     * @memberof Input
     */
    source: InputSource;
}


/**
 * 
 * @export
 * @interface InputDefinition
 */
export interface InputDefinition {
    /**
     * The @name used to reference this input in OPAL (without the @ sign)
     * @type {string}
     * @memberof InputDefinition
     */
    inputName: string;
    /**
     * Data or Reference, defaults to Data if not specified.
     * @type {string}
     * @memberof InputDefinition
     */
    inputRole?: string;
    /**
     * The dataset ID (as int64-string) to bind to this name.
     * @type {string}
     * @memberof InputDefinition
     */
    datasetId?: string;
    /**
     * The dataset name as Workspace.path/Name to bind to this name. datasetId takes precedence if both are set; on read, this is populated alongside datasetId as a portable reference.
     * @type {string}
     * @memberof InputDefinition
     */
    datasetPath?: string;
    /**
     * The stageID of the previously defined stage to reference, if it's a stage and not a dataset.
     * @type {string}
     * @memberof InputDefinition
     */
    stageId?: string;
    /**
     * The parameter ID to take the input dataset reference from. (Advanced usage only)
     * @type {string}
     * @memberof InputDefinition
     */
    parameterId?: string;
}
/**
 * How the pipeline uses this input. `Data` (the default; omit) is a
 * primary stream of rows. `Reference` is a lookup binding — a
 * dataset joined in to enrich the data rather than queried
 * directly.
 * 
 * @export
 * @enum {string}
 */
export enum InputRole {
    Data = 'Data',
    Reference = 'Reference'
}

/**
 * 
 * @export
 * @interface InputSource
 */
export interface InputSource {
    /**
     * 
     * @type {InputSourceType}
     * @memberof InputSource
     */
    type: InputSourceType;
    /**
     * Populated when `type` is `dataset`; absent otherwise.
     * @type {InputSourceDataset}
     * @memberof InputSource
     */
    dataset?: InputSourceDataset;
    /**
     * Populated when `type` is `card`; absent otherwise.
     * References another card's `id`.
     * 
     * @type {string}
     * @memberof InputSource
     */
    card?: string;
    /**
     * Names which dataset filter to bind, for documents that have more
     * than one. Omit to bind the primary `definition.datasetFilter` —
     * in that case `type: datasetFilter` is enough on its own. Absent
     * for other types.
     * 
     * @type {InputSourceDatasetFilter}
     * @memberof InputSource
     */
    datasetFilter?: InputSourceDatasetFilter;
}


/**
 * A dataset binding. Normally identified by `id`, but `id` may be absent
 * for a by-name binding — a mode where the input references a dataset only
 * by `name`/`path` (e.g. an input resolved across tenants, where IDs
 * differ but names match) — in which case `name` or `path` carries the
 * reference.
 * 
 * @export
 * @interface InputSourceDataset
 */
export interface InputSourceDataset {
    /**
     * 
     * @type {string}
     * @memberof InputSourceDataset
     */
    id?: string;
    /**
     * Human-readable dataset name. Optional but
     * encouraged — aids cross-tenant migration where
     * IDs differ but names match.
     * 
     * @type {string}
     * @memberof InputSourceDataset
     */
    name?: string;
    /**
     * Slash-delimited dataset path, e.g.
     * "kubernetes/Pod". Optional but encouraged.
     * 
     * @type {string}
     * @memberof InputSourceDataset
     */
    path?: string;
}
/**
 * A binding to one of the additional dataset filters carried in
 * `ui.additionalDatasetFilters`, named by `id`. The primary
 * `definition.datasetFilter` needs no body: an input binds it by setting
 * `type: datasetFilter` and omitting this object.
 * 
 * @export
 * @interface InputSourceDatasetFilter
 */
export interface InputSourceDatasetFilter {
    /**
     * Id of an entry in `ui.additionalDatasetFilters`.
     * @type {string}
     * @memberof InputSourceDatasetFilter
     */
    id: string;
}
/**
 * 
 * @export
 * @enum {string}
 */
export enum InputSourceType {
    Dataset = 'dataset',
    Card = 'card',
    DatasetFilter = 'datasetFilter'
}

/**
 * 
 * @export
 * @interface JoinField
 */
export interface JoinField {
    /**
     * 
     * @type {string}
     * @memberof JoinField
     */
    columnId: string;
    /**
     * Dotted path within the column, when the join key is a nested field.
     * @type {string}
     * @memberof JoinField
     */
    path?: string;
}
/**
 * Join specification for an `exists` predicate: `srcFields` on this dataset
 * map positionally to `dstFields` on the joined input.
 * 
 * @export
 * @interface JoinKey
 */
export interface JoinKey {
    /**
     * 
     * @type {Array<JoinField>}
     * @memberof JoinKey
     */
    srcFields: Array<JoinField>;
    /**
     * 
     * @type {Array<JoinField>}
     * @memberof JoinKey
     */
    dstFields: Array<JoinField>;
}
/**
 * Sections are laid out in a 12-column grid. The grid width is a
 * fixed UI convention, not a stored field.
 * 
 * @export
 * @interface Layout
 */
export interface Layout {
    /**
     * 
     * @type {Array<Section>}
     * @memberof Layout
     */
    sections: Array<Section>;
}
/**
 * Options for the legacy chart types — both the deprecated
 * variants of a current chart type and the specialized charts
 * that have no current equivalent. These charts predate the typed
 * options above, so their settings vary by chart type and are
 * only loosely validated: whatever is sent is preserved
 * unchanged under `extensions`.
 * 
 * New content SHOULD NOT use a deprecated type. Where a current
 * equivalent exists (for example `line` in place of
 * `timeseries_deprecated`), author that instead.
 * 
 * @export
 * @interface LegacyD3Options
 */
export interface LegacyD3Options {
    [key: string]: any | any;
    /**
     * An escape hatch for visualization settings that do not yet have
     * a typed field of their own. Contents are stored and returned
     * unchanged and are not validated, so newer clients can round-trip
     * settings this version of the schema does not name.
     * 
     * @type {{ [key: string]: any | undefined; }}
     * @memberof LegacyD3Options
     */
    extensions?: { [key: string]: any | undefined; };
}
/**
 * 
 * @export
 * @interface LegendConfig
 */
export interface LegendConfig {
    /**
     * Default `true`. Omit when default.
     * @type {boolean}
     * @memberof LegendConfig
     */
    visible?: boolean;
    /**
     * 
     * @type {LegendConfigLayout}
     * @memberof LegendConfig
     */
    layout?: LegendConfigLayout;
    /**
     * For `layout: table`, the per-series summary columns shown in
     * the legend, in order (e.g. "Last", "Min", "Max", "Avg",
     * "Sum"). Absent when the legend shows no summary columns.
     * 
     * @type {Array<string>}
     * @memberof LegendConfig
     */
    tableAggregates?: Array<string>;
}


/**
 * Default `list`. Omit when default.
 * @export
 * @enum {string}
 */
export enum LegendConfigLayout {
    List = 'list',
    Table = 'table'
}

/**
 * Line / area drawing options.
 * @export
 * @interface LineConfig
 */
export interface LineConfig {
    /**
     * 
     * @type {boolean}
     * @memberof LineConfig
     */
    showPoints?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof LineConfig
     */
    showValues?: boolean;
    /**
     * 
     * @type {LineCurveType}
     * @memberof LineConfig
     */
    curve?: LineCurveType;
    /**
     * 
     * @type {ChartAreaFillType}
     * @memberof LineConfig
     */
    areaFillType?: ChartAreaFillType;
}


/**
 * 
 * @export
 * @enum {string}
 */
export enum LineCurveType {
    Linear = 'Linear',
    Curve = 'Curve',
    Step = 'Step'
}

/**
 * 
 * @export
 * @interface LineOptions
 */
export interface LineOptions {
    /**
     * 
     * @type {AxisConfig}
     * @memberof LineOptions
     */
    xConfig?: AxisConfig;
    /**
     * 
     * @type {AxisConfig}
     * @memberof LineOptions
     */
    yConfig?: AxisConfig;
    /**
     * 
     * @type {ColorConfig}
     * @memberof LineOptions
     */
    colorConfig?: ColorConfig;
    /**
     * 
     * @type {LineConfig}
     * @memberof LineOptions
     */
    lineConfig?: LineConfig;
    /**
     * 
     * @type {boolean}
     * @memberof LineOptions
     */
    horizontal?: boolean;
    /**
     * An escape hatch for visualization settings that do not yet have
     * a typed field of their own. Contents are stored and returned
     * unchanged and are not validated, so newer clients can round-trip
     * settings this version of the schema does not name.
     * 
     * @type {{ [key: string]: any | undefined; }}
     * @memberof LineOptions
     */
    extensions?: { [key: string]: any | undefined; };
}
/**
 * 
 * @export
 * @interface LinkTarget
 */
export interface LinkTarget {
    /**
     * 
     * @type {LinkTargetKind}
     * @memberof LinkTarget
     */
    kind: LinkTargetKind;
    /**
     * 
     * @type {LinkTargetUrl}
     * @memberof LinkTarget
     */
    link?: LinkTargetUrl;
    /**
     * 
     * @type {LinkTargetDashboard}
     * @memberof LinkTarget
     */
    dashboard?: LinkTargetDashboard;
    /**
     * 
     * @type {LinkTargetLogExplorer}
     * @memberof LinkTarget
     */
    logExplorer?: LinkTargetLogExplorer;
    /**
     * 
     * @type {LinkTargetTraceExplorer}
     * @memberof LinkTarget
     */
    traceExplorer?: LinkTargetTraceExplorer;
    /**
     * 
     * @type {LinkTargetMetricsExplorer}
     * @memberof LinkTarget
     */
    metricsExplorer?: LinkTargetMetricsExplorer;
    /**
     * 
     * @type {LinkTargetServiceExplorer}
     * @memberof LinkTarget
     */
    serviceExplorer?: LinkTargetServiceExplorer;
}


/**
 * 
 * @export
 * @interface LinkTargetDashboard
 */
export interface LinkTargetDashboard {
    /**
     * 
     * @type {string}
     * @memberof LinkTargetDashboard
     */
    targetDashboardId: string;
    /**
     * Cached display name of the destination dashboard. Optional but
     * encouraged — used as the chrome label when `Drilldown.name` is
     * omitted.
     * 
     * @type {string}
     * @memberof LinkTargetDashboard
     */
    targetDashboardName?: string;
}
/**
 * 
 * @export
 * @enum {string}
 */
export enum LinkTargetKind {
    Link = 'link',
    Dashboard = 'dashboard',
    LogExplorer = 'logExplorer',
    TraceExplorer = 'traceExplorer',
    MetricsExplorer = 'metricsExplorer',
    ServiceExplorer = 'serviceExplorer'
}

/**
 * 
 * @export
 * @interface LinkTargetLogExplorer
 */
export interface LinkTargetLogExplorer {
    /**
     * 
     * @type {string}
     * @memberof LinkTargetLogExplorer
     */
    targetDatasetId?: string;
    /**
     * 
     * @type {string}
     * @memberof LinkTargetLogExplorer
     */
    targetDatasetName?: string;
}
/**
 * 
 * @export
 * @interface LinkTargetMetricsExplorer
 */
export interface LinkTargetMetricsExplorer {
    /**
     * 
     * @type {string}
     * @memberof LinkTargetMetricsExplorer
     */
    targetDatasetId?: string;
    /**
     * 
     * @type {string}
     * @memberof LinkTargetMetricsExplorer
     */
    targetDatasetName?: string;
    /**
     * Optional metric to preselect in the metrics explorer.
     * @type {string}
     * @memberof LinkTargetMetricsExplorer
     */
    targetMetricName?: string;
}
/**
 * 
 * @export
 * @interface LinkTargetServiceExplorer
 */
export interface LinkTargetServiceExplorer {
    /**
     * 
     * @type {string}
     * @memberof LinkTargetServiceExplorer
     */
    targetDatasetId?: string;
    /**
     * 
     * @type {string}
     * @memberof LinkTargetServiceExplorer
     */
    targetDatasetName?: string;
}
/**
 * 
 * @export
 * @interface LinkTargetTraceExplorer
 */
export interface LinkTargetTraceExplorer {
    /**
     * 
     * @type {string}
     * @memberof LinkTargetTraceExplorer
     */
    targetDatasetId?: string;
    /**
     * 
     * @type {string}
     * @memberof LinkTargetTraceExplorer
     */
    targetDatasetName?: string;
}
/**
 * A link to an arbitrary URL.
 * @export
 * @interface LinkTargetUrl
 */
export interface LinkTargetUrl {
    /**
     * 
     * @type {string}
     * @memberof LinkTargetUrl
     */
    url: string;
    /**
     * Icon name for the URL link in card chrome. Default `link`.
     * Omit when default.
     * 
     * @type {string}
     * @memberof LinkTargetUrl
     */
    icon?: string;
}
/**
 * 
 * @export
 * @enum {string}
 */
export enum ListApmEnvironmentsOrderByParameter {
    Environment = 'environment',
    Environment2 = '-environment'
}

/**
 * 
 * @export
 * @enum {string}
 */
export enum ListApmServicesOrderByParameter {
    ServiceName = 'serviceName',
    ServiceName2 = '-serviceName',
    Environment = 'environment',
    Environment2 = '-environment',
    ServiceNamespace = 'serviceNamespace',
    ServiceNamespace2 = '-serviceNamespace',
    InvocationRatePerSecond = 'invocationRatePerSecond',
    InvocationRatePerSecond2 = '-invocationRatePerSecond',
    ErrorRatePerSecond = 'errorRatePerSecond',
    ErrorRatePerSecond2 = '-errorRatePerSecond',
    DurationP95Seconds = 'durationP95Seconds',
    DurationP95Seconds2 = '-durationP95Seconds'
}

/**
 * 
 * @export
 * @interface ListDatasetQueryFilters200Response
 */
export interface ListDatasetQueryFilters200Response {
    /**
     * 
     * @type {Array<DatasetQueryFilterResource>}
     * @memberof ListDatasetQueryFilters200Response
     */
    queryFilters: Array<DatasetQueryFilterResource>;
    /**
     * 
     * @type {Meta}
     * @memberof ListDatasetQueryFilters200Response
     */
    meta: Meta;
}
/**
 * 
 * @export
 * @interface ListDatasetsResponse
 */
export interface ListDatasetsResponse {
    /**
     * 
     * @type {boolean}
     * @memberof ListDatasetsResponse
     */
    ok?: boolean;
    /**
     * 
     * @type {Array<DatasetLegacyResource>}
     * @memberof ListDatasetsResponse
     */
    data?: Array<DatasetLegacyResource>;
}
/**
 * 
 * @export
 * @enum {string}
 */
export enum ListSkillsVisibilityParameter {
    Listed = 'Listed',
    Unlisted = 'Unlisted'
}

/**
 * 
 * @export
 * @interface LogScale
 */
export interface LogScale {
    /**
     * 
     * @type {boolean}
     * @memberof LogScale
     */
    use?: boolean;
    /**
     * 
     * @type {number}
     * @memberof LogScale
     */
    base?: number;
}
/**
 * A text card. Renders formatted prose rather than data.
 * @export
 * @interface MarkdownCard
 */
export interface MarkdownCard {
    /**
     * 
     * @type {string}
     * @memberof MarkdownCard
     */
    title?: string;
    /**
     * CommonMark text rendered in the card.
     * @type {string}
     * @memberof MarkdownCard
     */
    body: string;
}
/**
 * List Response Metadata
 * @export
 * @interface Meta
 */
export interface Meta {
    /**
     * The total number of resources available, independent of pagination.
     * The API may return -1 if the total count is unknown or cannot be computed
     * in reasonable time.
     * 
     * @type {number}
     * @memberof Meta
     */
    totalCount: number;
}
/**
 * 
 * @export
 * @interface MetricListResponse
 */
export interface MetricListResponse {
    /**
     * 
     * @type {Array<MetricResource>}
     * @memberof MetricListResponse
     */
    metrics: Array<MetricResource>;
    /**
     * 
     * @type {Meta}
     * @memberof MetricListResponse
     */
    meta: Meta;
}
/**
 * A metric resource. Metrics do not have a globally unique ObjectId —
 * they are identified by the tuple (dataset.id, name).
 * 
 * @export
 * @interface MetricResource
 */
export interface MetricResource {
    /**
     * The metric's name within its dataset.
     * @type {string}
     * @memberof MetricResource
     */
    name: string;
    /**
     * Reference to the dataset that owns this metric. With ?expand=true,
     * `record` is populated with the dataset brief (label, description,
     * iconUrl, contentType).
     * 
     * @type {DatasetRef}
     * @memberof MetricResource
     */
    dataset: DatasetRef;
    /**
     * 
     * @type {MetricType}
     * @memberof MetricResource
     */
    type: MetricType;
    /**
     * Unit the metric values are reported in (e.g. "ms", "bytes",
     * "requests/s"). Null when not specified.
     * 
     * @type {string}
     * @memberof MetricResource
     */
    unit: string | null;
    /**
     * Free-form description of what the metric measures. Null when
     * not specified.
     * 
     * @type {string}
     * @memberof MetricResource
     */
    description: string | null;
    /**
     * How values are combined when reducing along the time axis (e.g.
     * "sum", "avg", "max", "min", "rate"). Drives the default temporal
     * aggregation when querying this metric.
     * 
     * @type {string}
     * @memberof MetricResource
     */
    rollup: string;
    /**
     * How values are combined when reducing along non-time dimensions
     * (e.g. "sum", "avg", "max", "min"). Drives the default spatial
     * aggregation across tag groupings.
     * 
     * @type {string}
     * @memberof MetricResource
     */
    aggregate: string;
    /**
     * Reporting interval, in milliseconds (e.g. 60000 for a metric
     * reported every 60 seconds). If the user declared an interval
     * for this metric (via the `set_metric` OPAL verb), this field reflects
     * the declared value. Otherwise, this field is the observed cadence
     * derived from metric discovery sampling. Null when neither a declaration nor sufficient
     * observations are available.
     * 
     * @type {number}
     * @memberof MetricResource
     */
    intervalMillis: number | null;
    /**
     * Suggested bucket size for queries against this metric, in
     * milliseconds. Null when not enough samples have been observed.
     * 
     * @type {number}
     * @memberof MetricResource
     */
    suggestedBucketSizeMillis: number | null;
    /**
     * Whether the metric has been defined explicitly by the user.
     * Non-user-defined metrics are discovered by scanning metric data.
     * 
     * @type {boolean}
     * @memberof MetricResource
     */
    userDefined: boolean;
    /**
     * 
     * @type {MetricStatus}
     * @memberof MetricResource
     */
    status: MetricStatus;
    /**
     * Last time this metric was reported, derived from metric
     * discovery sampling. May be underreported by up to an hour.
     * Null when no observations are available.
     * 
     * @type {string}
     * @memberof MetricResource
     */
    lastReported: string | null;
    /**
     * Number of data points observed for this metric in the
     * discovery sampling window. Null when no observations are
     * available.
     * 
     * @type {number}
     * @memberof MetricResource
     */
    pointCount: number | null;
    /**
     * Number of distinct tag combinations observed for this metric
     * in the discovery sampling window. Null when no observations
     * are available.
     * 
     * @type {number}
     * @memberof MetricResource
     */
    cardinality: number | null;
    /**
     * Link labels on the metric dataset that are useful for
     * grouping/filtering this metric, ranked by usefulness and
     * cardinality. Derived from metric discovery sampling.
     * 
     * @type {Array<string>}
     * @memberof MetricResource
     */
    linkLabels: Array<string>;
    /**
     * Tag paths observed for this metric, ranked by cardinality.
     * Derived from metric discovery sampling.
     * 
     * @type {Array<DatasetFieldPath>}
     * @memberof MetricResource
     */
    metricTags: Array<DatasetFieldPath>;
    /**
     * Correlation tags on the metric dataset filtered to those
     * relevant to this metric. Derived from metric discovery
     * sampling.
     * 
     * @type {Array<DatasetCorrelationTag>}
     * @memberof MetricResource
     */
    correlationTags: Array<DatasetCorrelationTag>;
}


/**
 * Active: usable and currently reporting.
 * Inactive: usable, but not currently reporting.
 * Error: unusable because the metric dataset has errors in its
 * definition.
 * 
 * @export
 * @enum {string}
 */
export enum MetricStatus {
    Active = 'Active',
    Inactive = 'Inactive',
    Error = 'Error'
}

/**
 * Metric semantic type.
 * 
 * * `CumulativeCounter`: A metric that represents a non-decreasing counter with possible resets.
 * * `Delta`: A metric that represents a change in a value over time
 * * `Gauge`: A metric that represents a value that can increase or decrease
 * * `TDigest`: A metric that represents a t-digest of values
 * * `Sample`: A metric that represents a sample of values
 * * `Histogram`: A metric that represents an OpenTelemetry explicit bucket histogram
 * * `ExponentialHistogram`: A metric that represents an OpenTelemetry exponential histogram
 * 
 * @export
 * @enum {string}
 */
export enum MetricType {
    CumulativeCounter = 'CumulativeCounter',
    Delta = 'Delta',
    Gauge = 'Gauge',
    TDigest = 'TDigest',
    Sample = 'Sample',
    Histogram = 'Histogram',
    ExponentialHistogram = 'ExponentialHistogram'
}

/**
 * Whether AI auto-investigation runs when this monitor alerts. `None` disables it; `Triage` runs it.
 * 
 * @export
 * @enum {string}
 */
export enum MonitorAiTriagingMode {
    None = 'None',
    Triage = 'Triage'
}

/**
 * Whether the monitor is alerting now, has alerted before, or never has. `Triggering` means an alarm is open, or one was raised since the last evaluation; a monitor that is turned off is never `Triggering` because it cannot evaluate. `Previous` means it has alerted at some point but is not now — the same set as `lastAlarmTime != null` minus the triggering ones.
 * 
 * @export
 * @enum {string}
 */
export enum MonitorAlertState {
    Never = 'Never',
    Previous = 'Previous',
    Triggering = 'Triggering'
}

/**
 * Brief monitor metadata included when a reference is expanded.
 * @export
 * @interface MonitorBrief
 */
export interface MonitorBrief {
    /**
     * The monitor's display label.
     * @type {string}
     * @memberof MonitorBrief
     */
    label: string;
    /**
     * The monitor's description. Null when no description is configured.
     * @type {string}
     * @memberof MonitorBrief
     */
    description: string | null;
}
/**
 * Detail for a monitor disabled for exceeding its alert rate limit.
 * @export
 * @interface MonitorDisabledByAlertRateLimit
 */
export interface MonitorDisabledByAlertRateLimit {
    /**
     * The monitor's configured maximum alerts per hour.
     * @type {number}
     * @memberof MonitorDisabledByAlertRateLimit
     */
    alertRateLimit: number;
    /**
     * Alerts generated within the lookback window, which exceeded `alertRateLimit` and triggered the disable.
     * 
     * @type {number}
     * @memberof MonitorDisabledByAlertRateLimit
     */
    alertsGenerated: number;
    /**
     * Length of the window over which alerts were counted.
     * @type {number}
     * @memberof MonitorDisabledByAlertRateLimit
     */
    lookbackSeconds: number;
}
/**
 * Detail for a monitor the cost governor disabled.
 * @export
 * @interface MonitorDisabledByCost
 */
export interface MonitorDisabledByCost {
    /**
     * The daily credit limit the monitor exceeded.
     * @type {number}
     * @memberof MonitorDisabledByCost
     */
    creditLimitPerDay: number;
}
/**
 * Detail for a monitor disabled because a run result was too large. Either the bytes pair or the rows pair is set; the other is null.
 * 
 * @export
 * @interface MonitorDisabledByResultTooBig
 */
export interface MonitorDisabledByResultTooBig {
    /**
     * Bytes read. Null for a row-limit disable.
     * @type {number}
     * @memberof MonitorDisabledByResultTooBig
     */
    bytesRead: number | null;
    /**
     * Byte limit exceeded. Null for a row-limit disable.
     * @type {number}
     * @memberof MonitorDisabledByResultTooBig
     */
    bytesLimit: number | null;
    /**
     * Rows read. Null for a byte-limit disable.
     * @type {number}
     * @memberof MonitorDisabledByResultTooBig
     */
    rowsRead: number | null;
    /**
     * Row limit exceeded. Null for a byte-limit disable.
     * @type {number}
     * @memberof MonitorDisabledByResultTooBig
     */
    rowsLimit: number | null;
}
/**
 * Detail for a monitor a user explicitly disabled.
 * @export
 * @interface MonitorDisabledByUser
 */
export interface MonitorDisabledByUser {
    /**
     * 
     * @type {User}
     * @memberof MonitorDisabledByUser
     */
    disabledBy: User;
}
/**
 * Why a monitor was disabled.
 * @export
 * @enum {string}
 */
export enum MonitorDisabledCause {
    AlertRateLimit = 'AlertRateLimit',
    Cost = 'Cost',
    ResultTooBig = 'ResultTooBig',
    User = 'User'
}

/**
 * Why the monitor is disabled. Exactly one of the cause-specific fields is populated, matching `cause`; the others are null.
 * 
 * @export
 * @interface MonitorDisabledDetail
 */
export interface MonitorDisabledDetail {
    /**
     * 
     * @type {MonitorDisabledCause}
     * @memberof MonitorDisabledDetail
     */
    cause: MonitorDisabledCause;
    /**
     * 
     * @type {MonitorDisabledByCost}
     * @memberof MonitorDisabledDetail
     */
    cost: MonitorDisabledByCost | null;
    /**
     * 
     * @type {MonitorDisabledByAlertRateLimit}
     * @memberof MonitorDisabledDetail
     */
    alertRateLimit: MonitorDisabledByAlertRateLimit | null;
    /**
     * 
     * @type {MonitorDisabledByUser}
     * @memberof MonitorDisabledDetail
     */
    user: MonitorDisabledByUser | null;
    /**
     * 
     * @type {MonitorDisabledByResultTooBig}
     * @memberof MonitorDisabledDetail
     */
    resultTooBig: MonitorDisabledByResultTooBig | null;
}


/**
 * Where the monitor sits against its configured spend limit. `Normal` is within budget, `GracePeriod` is over it but still evaluating, and `CostDisabled` means the limit has turned it off.
 * 
 * @export
 * @enum {string}
 */
export enum MonitorGovernorState {
    CostDisabled = 'CostDisabled',
    GracePeriod = 'GracePeriod',
    Normal = 'Normal'
}

/**
 * The monitor's operating state as one value, which is what the monitors
 * list shows in its Health column and facets on.
 * 
 * `rollupStatus` answers a narrower question — how the last evaluation
 * went — so it reports `Running` for a monitor that is turned off, over its
 * spend limit, or on a passive cluster. `health` ranks those causes above
 * the run outcome, highest first:
 * 
 * | Value | Meaning |
 * |---|---|
 * | `CostDisabled` | Turned off after exceeding its spend limit. |
 * | `AlertRateLimitDisabled` | Turned off after exceeding its alert rate. |
 * | `Disabled` | Turned off by a user. |
 * | `ClusterPassive` | Its customer's monitoring is not active on this cluster, so nothing evaluates. Set for every monitor of that customer at once. |
 * | `AtRisk` | Inside the grace period before its spend limit disables it. |
 * | `Failed` | An error was logged since the last run, less than a week ago. |
 * | `Warnings` | Likewise a warning. |
 * | `Initializing` | An anomaly monitor that has not yet produced its output dataset, so it cannot evaluate. |
 * | `Running` | None of the above. |
 * 
 * A monitor can satisfy several; only the highest is reported, and the
 * ranking may change. `Initializing` is only partially reachable — see the
 * note under the list operation's `filter` for the warm-up tail this
 * endpoint cannot see.
 * 
 * @export
 * @enum {string}
 */
export enum MonitorHealth {
    AlertRateLimitDisabled = 'AlertRateLimitDisabled',
    AtRisk = 'AtRisk',
    ClusterPassive = 'ClusterPassive',
    CostDisabled = 'CostDisabled',
    Disabled = 'Disabled',
    Failed = 'Failed',
    Initializing = 'Initializing',
    Running = 'Running',
    Warnings = 'Warnings'
}

/**
 * One page of monitors. `meta.totalCount` counts the monitors matching the request across all pages, not the page.
 * 
 * @export
 * @interface MonitorListResponse
 */
export interface MonitorListResponse {
    /**
     * 
     * @type {Array<MonitorResource>}
     * @memberof MonitorListResponse
     */
    monitors: Array<MonitorResource>;
    /**
     * 
     * @type {Meta}
     * @memberof MonitorListResponse
     */
    meta: Meta;
}
/**
 * 
 * @export
 * @interface MonitorMuteCreateRequest
 */
export interface MonitorMuteCreateRequest {
    /**
     * 
     * @type {string}
     * @memberof MonitorMuteCreateRequest
     */
    label: string;
    /**
     * Free-form description. Omit to leave blank.
     * @type {string}
     * @memberof MonitorMuteCreateRequest
     */
    description?: string;
    /**
     * 
     * @type {MonitorMuteTargetInput}
     * @memberof MonitorMuteCreateRequest
     */
    target: MonitorMuteTargetInput;
    /**
     * 
     * @type {MonitorMuteScheduleInput}
     * @memberof MonitorMuteCreateRequest
     */
    schedule: MonitorMuteScheduleInput;
    /**
     * CEL boolean expression evaluated against each fired alarm row. Required and non-empty when `target.kind` is `Global` (prevents accidental fleet-wide suppression). When `target.kind` is `Monitors`, omit to suppress all firings for those monitors unconditionally. Example: `level == "Critical" && context["service"] == "payments"`.
     * 
     * @type {string}
     * @memberof MonitorMuteCreateRequest
     */
    filter?: string;
}
/**
 * 
 * @export
 * @interface MonitorMuteCronSchedule
 */
export interface MonitorMuteCronSchedule {
    /**
     * POSIX 5-field cron expression (`minute hour day-of-month month day-of-week`). No seconds field, no year field, no Quartz extensions, no `@daily`-style macros. Fields support `*` (any), `,` (list), `-` (range), and `/` (step). The server rejects expressions outside this dialect with `invalid_schedule`. Examples: `0 2 * * *` (daily at 02:00), `0 9-17 * * 1-5` (every hour 09:00–17:00 Mon–Fri), `0-59/15 * * * *` (every 15 min).
     * 
     * @type {string}
     * @memberof MonitorMuteCronSchedule
     */
    rawCron: string;
    /**
     * IANA timezone name. Example: "America/Los_Angeles".
     * @type {string}
     * @memberof MonitorMuteCronSchedule
     */
    timezone: string;
}
/**
 * 
 * @export
 * @interface MonitorMuteListResponse
 */
export interface MonitorMuteListResponse {
    /**
     * 
     * @type {Array<MonitorMuteResource>}
     * @memberof MonitorMuteListResponse
     */
    monitorMutes: Array<MonitorMuteResource>;
    /**
     * 
     * @type {Meta}
     * @memberof MonitorMuteListResponse
     */
    meta: Meta;
}
/**
 * A one-time mute window. Always fully populated in responses.
 * @export
 * @interface MonitorMuteOneTime
 */
export interface MonitorMuteOneTime {
    /**
     * Start of the mute window.
     * @type {string}
     * @memberof MonitorMuteOneTime
     */
    startTime: string;
    /**
     * End of the mute window. `null` means until manually deleted.
     * @type {string}
     * @memberof MonitorMuteOneTime
     */
    endTime: string | null;
}
/**
 * Input shape for a one-time schedule. `startTime` is required. Omit `endTime` or pass `null` to create an open-ended mute.
 * 
 * @export
 * @interface MonitorMuteOneTimeInput
 */
export interface MonitorMuteOneTimeInput {
    /**
     * Start of the mute window.
     * @type {string}
     * @memberof MonitorMuteOneTimeInput
     */
    startTime: string;
    /**
     * End of the mute window. Omit or pass `null` for open-ended.
     * @type {string}
     * @memberof MonitorMuteOneTimeInput
     */
    endTime?: string | null;
}
/**
 * A recurring mute window driven by a cron schedule.
 * @export
 * @interface MonitorMuteRecurring
 */
export interface MonitorMuteRecurring {
    /**
     * 
     * @type {MonitorMuteCronSchedule}
     * @memberof MonitorMuteRecurring
     */
    cronSchedule: MonitorMuteCronSchedule;
    /**
     * Wall-clock length of each fired window in seconds. Must be at least 1.
     * @type {number}
     * @memberof MonitorMuteRecurring
     */
    durationSeconds: number;
}
/**
 * Input shape for a recurring schedule. Mirrors `MonitorMute-Recurring`; kept separate so server-computed response fields can be added to the response type without widening the write contract.
 * 
 * @export
 * @interface MonitorMuteRecurringInput
 */
export interface MonitorMuteRecurringInput {
    /**
     * 
     * @type {MonitorMuteCronSchedule}
     * @memberof MonitorMuteRecurringInput
     */
    cronSchedule: MonitorMuteCronSchedule;
    /**
     * Wall-clock length of each fired window in seconds. Must be at least 1.
     * @type {number}
     * @memberof MonitorMuteRecurringInput
     */
    durationSeconds: number;
}
/**
 * A mute rule suppresses alert notifications during a defined time window. Use `target.kind: Global` to mute all monitors, or `target.kind: Monitors` to target a specific set.
 * 
 * @export
 * @interface MonitorMuteResource
 */
export interface MonitorMuteResource {
    /**
     * 
     * @type {string}
     * @memberof MonitorMuteResource
     */
    id: string;
    /**
     * Human-readable name for this mute rule.
     * @type {string}
     * @memberof MonitorMuteResource
     */
    label: string;
    /**
     * Free-form description. `null` when unset.
     * @type {string}
     * @memberof MonitorMuteResource
     */
    description: string | null;
    /**
     * 
     * @type {MonitorMuteTarget}
     * @memberof MonitorMuteResource
     */
    target: MonitorMuteTarget;
    /**
     * 
     * @type {MonitorMuteSchedule}
     * @memberof MonitorMuteResource
     */
    schedule: MonitorMuteSchedule;
    /**
     * Optional CEL boolean expression evaluated against each fired alarm row at notification time. `null` means every firing is suppressed. Required and non-empty when `target.kind` is `Global` to prevent accidental fleet-wide suppression. Example: `level == "Critical" && context["service"] == "payments"`.
     * 
     * @type {string}
     * @memberof MonitorMuteResource
     */
    filter: string | null;
    /**
     * Computed start of the current or next active window. For `OneTime` schedules this mirrors `schedule.oneTime.startTime`. For `Recurring` schedules this is the next computed firing time. `null` between recurring windows.
     * 
     * @type {string}
     * @memberof MonitorMuteResource
     */
    startTime: string | null;
    /**
     * Computed end of the current or next active window. For `OneTime` schedules this mirrors `schedule.oneTime.endTime` (`null` for open-ended mutes). For `Recurring` schedules this is `startTime + durationSeconds`.
     * 
     * @type {string}
     * @memberof MonitorMuteResource
     */
    endTime: string | null;
    /**
     * 
     * @type {User}
     * @memberof MonitorMuteResource
     */
    createdBy: User;
    /**
     * 
     * @type {string}
     * @memberof MonitorMuteResource
     */
    createdAt: string;
    /**
     * 
     * @type {User}
     * @memberof MonitorMuteResource
     */
    updatedBy: User;
    /**
     * 
     * @type {string}
     * @memberof MonitorMuteResource
     */
    updatedAt: string;
}
/**
 * Discriminated schedule. Both `oneTime` and `recurring` are always present in responses; the inactive sibling is `null`.
 * 
 * @export
 * @interface MonitorMuteSchedule
 */
export interface MonitorMuteSchedule {
    /**
     * 
     * @type {MonitorMuteScheduleKind}
     * @memberof MonitorMuteSchedule
     */
    kind: MonitorMuteScheduleKind;
    /**
     * 
     * @type {MonitorMuteOneTime}
     * @memberof MonitorMuteSchedule
     */
    oneTime: MonitorMuteOneTime | null;
    /**
     * 
     * @type {MonitorMuteRecurring}
     * @memberof MonitorMuteSchedule
     */
    recurring: MonitorMuteRecurring | null;
}


/**
 * Input shape for a schedule. `kind` is required; send only the sibling matching `kind` (`oneTime` or `recurring`).
 * 
 * @export
 * @interface MonitorMuteScheduleInput
 */
export interface MonitorMuteScheduleInput {
    /**
     * 
     * @type {MonitorMuteScheduleKind}
     * @memberof MonitorMuteScheduleInput
     */
    kind: MonitorMuteScheduleKind;
    /**
     * 
     * @type {MonitorMuteOneTimeInput}
     * @memberof MonitorMuteScheduleInput
     */
    oneTime?: MonitorMuteOneTimeInput;
    /**
     * 
     * @type {MonitorMuteRecurringInput}
     * @memberof MonitorMuteScheduleInput
     */
    recurring?: MonitorMuteRecurringInput;
}


/**
 * `OneTime` defines a fixed window with an explicit start and optional end. `Recurring` fires on a cron schedule for a specified duration.
 * 
 * @export
 * @enum {string}
 */
export enum MonitorMuteScheduleKind {
    OneTime = 'OneTime',
    Recurring = 'Recurring'
}

/**
 * Whether mute rules currently suppress this monitor's notifications. `PartiallyMuted` means every covering rule is scoped to particular alert groupings, so some alerts still notify.
 * 
 * @export
 * @enum {string}
 */
export enum MonitorMuteState {
    Muted = 'Muted',
    NotMuted = 'NotMuted',
    PartiallyMuted = 'PartiallyMuted'
}

/**
 * Describes which monitors this mute rule applies to. `monitors` is always present: empty when `kind` is `Global`, non-empty when `kind` is `Monitors`.
 * 
 * @export
 * @interface MonitorMuteTarget
 */
export interface MonitorMuteTarget {
    /**
     * 
     * @type {MonitorMuteTargetKind}
     * @memberof MonitorMuteTarget
     */
    kind: MonitorMuteTargetKind;
    /**
     * 
     * @type {Array<MonitorRef>}
     * @memberof MonitorMuteTarget
     */
    monitors: Array<MonitorRef>;
}


/**
 * Input shape for a mute target. `kind` is optional in PATCH — if provided it must match the existing value since `kind` is immutable after creation. `monitors` is required and non-empty when `kind` is `Monitors`; omit or leave empty when `kind` is `Global`.
 * 
 * @export
 * @interface MonitorMuteTargetInput
 */
export interface MonitorMuteTargetInput {
    /**
     * 
     * @type {MonitorMuteTargetKind}
     * @memberof MonitorMuteTargetInput
     */
    kind?: MonitorMuteTargetKind;
    /**
     * 
     * @type {Array<MonitorRef>}
     * @memberof MonitorMuteTargetInput
     */
    monitors?: Array<MonitorRef>;
}


/**
 * `Global` suppresses all monitors (requires a non-empty `filter`). `Monitors` targets a specific set of monitors by ID.
 * 
 * @export
 * @enum {string}
 */
export enum MonitorMuteTargetKind {
    Global = 'Global',
    Monitors = 'Monitors'
}

/**
 * All fields are optional. Omitted fields are left unchanged. Sending a `target` object replaces the entire target subtree atomically; `target.kind` must match the existing value (it is immutable). Send `filter: null` to remove an existing filter.
 * 
 * @export
 * @interface MonitorMuteUpdateRequest
 */
export interface MonitorMuteUpdateRequest {
    /**
     * 
     * @type {string}
     * @memberof MonitorMuteUpdateRequest
     */
    label?: string;
    /**
     * Pass `null` to clear the description.
     * @type {string}
     * @memberof MonitorMuteUpdateRequest
     */
    description?: string | null;
    /**
     * 
     * @type {MonitorMuteTargetInput}
     * @memberof MonitorMuteUpdateRequest
     */
    target?: MonitorMuteTargetInput;
    /**
     * 
     * @type {MonitorMuteScheduleInput}
     * @memberof MonitorMuteUpdateRequest
     */
    schedule?: MonitorMuteScheduleInput;
    /**
     * Pass `null` to remove an existing filter.
     * @type {string}
     * @memberof MonitorMuteUpdateRequest
     */
    filter?: string | null;
}
/**
 * Reference to a monitor. Always carries the `id`. The `record` field is
 * populated with brief metadata only when `expand=true`.
 * 
 * @export
 * @interface MonitorRef
 */
export interface MonitorRef {
    /**
     * 
     * @type {string}
     * @memberof MonitorRef
     */
    id: string;
    /**
     * 
     * @type {MonitorBrief}
     * @memberof MonitorRef
     */
    record?: MonitorBrief;
}
/**
 * A monitor that watches your data and raises alerts when a condition is met.
 * @export
 * @interface MonitorResource
 */
export interface MonitorResource {
    /**
     * 
     * @type {string}
     * @memberof MonitorResource
     */
    id: string;
    /**
     * Display name of the monitor.
     * @type {string}
     * @memberof MonitorResource
     */
    label: string;
    /**
     * Monitor description. Null when no description is configured.
     * @type {string}
     * @memberof MonitorResource
     */
    description: string | null;
    /**
     * Whether the monitor is currently disabled, either by a user or automatically by the system on exceeding its alert rate or cost limit.
     * 
     * @type {boolean}
     * @memberof MonitorResource
     */
    disabled: boolean;
    /**
     * 
     * @type {MonitorRuleKind}
     * @memberof MonitorResource
     */
    ruleKind: MonitorRuleKind;
    /**
     * Version of the monitor's current definition, as a Unix nanosecond timestamp — currently identical to `updatedAt`, and so it advances on every save. Alerts record the version they were evaluated against, so this identifies which definition produced a given alert. Carried as a string because it exceeds the JSON safe-integer range.
     * 
     * @type {string}
     * @memberof MonitorResource
     */
    monitorVersion: string;
    /**
     * 
     * @type {User}
     * @memberof MonitorResource
     */
    createdBy: User;
    /**
     * 
     * @type {string}
     * @memberof MonitorResource
     */
    createdAt: string;
    /**
     * 
     * @type {User}
     * @memberof MonitorResource
     */
    updatedBy: User;
    /**
     * 
     * @type {string}
     * @memberof MonitorResource
     */
    updatedAt: string;
    /**
     * 
     * @type {MonitorDisabledDetail}
     * @memberof MonitorResource
     */
    disabledDetail: MonitorDisabledDetail | null;
    /**
     * Whether the monitor runs on its own schedule rather than following its input dataset's transform.
     * 
     * @type {boolean}
     * @memberof MonitorResource
     */
    scheduled: boolean;
    /**
     * 
     * @type {MonitorRollupStatus}
     * @memberof MonitorResource
     */
    rollupStatus: MonitorRollupStatus;
    /**
     * 
     * @type {MonitorHealth}
     * @memberof MonitorResource
     */
    health: MonitorHealth;
    /**
     * 
     * @type {MonitorGovernorState}
     * @memberof MonitorResource
     */
    governorState: MonitorGovernorState | null;
    /**
     * 
     * @type {MonitorAlertState}
     * @memberof MonitorResource
     */
    alertState: MonitorAlertState;
    /**
     * 
     * @type {MonitorAiTriagingMode}
     * @memberof MonitorResource
     */
    aiTriagingMode: MonitorAiTriagingMode | null;
    /**
     * 
     * @type {MonitorMuteState}
     * @memberof MonitorResource
     */
    muteState: MonitorMuteState;
    /**
     * When the mute covering this monitor expires. Null when the monitor is not muted, or is muted indefinitely — use `muteState` to tell those apart.
     * 
     * @type {string}
     * @memberof MonitorResource
     */
    mutedUntil: string | null;
    /**
     * Number of mute rules currently covering this monitor.
     * @type {number}
     * @memberof MonitorResource
     */
    muteCount: number;
    /**
     * When the monitor last logged a fatal error. Null if it never has.
     * 
     * @type {string}
     * @memberof MonitorResource
     */
    lastErrorTime: string | null;
    /**
     * When the monitor last raised an alert. Null if it never has.
     * @type {string}
     * @memberof MonitorResource
     */
    lastAlarmTime: string | null;
    /**
     * When the monitor last logged a non-fatal warning. Null if it never has.
     * 
     * @type {string}
     * @memberof MonitorResource
     */
    lastWarnTime: string | null;
    /**
     * 
     * @type {ObjectRef}
     * @memberof MonitorResource
     */
    managedBy: ObjectRef | null;
}


/**
 * Single health summary, derived from the monitor's other fields and resolved by priority, highest first: `Disabled` (by a user or a limit), `Failed` (an error logged since the last run and less than a week old), `Warnings` (likewise a warning), `Initializing` (an anomaly monitor that has not yet produced its output dataset, so it cannot evaluate yet), `Running` (the default). A monitor can satisfy more than one — only the highest is reported, and the ranking may change. See the note under the list operation's `filter` for the part of `Initializing` this endpoint cannot see.
 * 
 * @export
 * @enum {string}
 */
export enum MonitorRollupStatus {
    Disabled = 'Disabled',
    Failed = 'Failed',
    Initializing = 'Initializing',
    Running = 'Running',
    Warnings = 'Warnings'
}

/**
 * The evaluation rule kind of the monitor. `Composite` is the one kind that inspects no query: it alerts on a boolean condition over whether other monitors are currently alerting, correlated per group.
 * 
 * @export
 * @enum {string}
 */
export enum MonitorRuleKind {
    Anomaly = 'Anomaly',
    Composite = 'Composite',
    Count = 'Count',
    Promote = 'Promote',
    Threshold = 'Threshold'
}

/**
 * 
 * @export
 * @interface MonitorStatsMeta
 */
export interface MonitorStatsMeta {
    /**
     * Monitors the caller may read, before `filter` is applied.
     * 
     * @type {number}
     * @memberof MonitorStatsMeta
     */
    totalMonitors: number;
    /**
     * Monitors the statistics were computed over, after `filter` is applied. Equal to `totalMonitors` when no filter was given.
     * 
     * @type {number}
     * @memberof MonitorStatsMeta
     */
    filteredMonitors: number;
}
/**
 * Aggregated stats for the requested monitor attributes.
 * @export
 * @interface MonitorStatsResponse
 */
export interface MonitorStatsResponse {
    /**
     * One entry per requested `attributes` expression, in request order.
     * 
     * @type {Array<AttributeStats>}
     * @memberof MonitorStatsResponse
     */
    attributes: Array<AttributeStats>;
    /**
     * 
     * @type {MonitorStatsMeta}
     * @memberof MonitorStatsResponse
     */
    meta: MonitorStatsMeta;
}
/**
 * 
 * @export
 * @interface MonitorV2
 */
export interface MonitorV2 {
    /**
     * 
     * @type {string}
     * @memberof MonitorV2
     */
    readonly id: string;
    /**
     * 
     * @type {string}
     * @memberof MonitorV2
     */
    name: string;
    /**
     * 
     * @type {boolean}
     * @memberof MonitorV2
     */
    readonly disabled?: boolean;
    /**
     * 
     * @type {MonitorV2Health}
     * @memberof MonitorV2
     */
    readonly health?: MonitorV2Health;
    /**
     * 
     * @type {MonitorV2RuleKind}
     * @memberof MonitorV2
     */
    ruleKind: MonitorV2RuleKind;
    /**
     * 
     * @type {MonitorV2Definition}
     * @memberof MonitorV2
     */
    definition: MonitorV2Definition;
    /**
     * 
     * @type {Array<MonitorV2ActionRule>}
     * @memberof MonitorV2
     */
    actionRules?: Array<MonitorV2ActionRule>;
    /**
     * The resolved scheduling mode the monitor is actually using, as determined by the backend. Always populated on GET responses. This may differ from definition.scheduling, which only reflects what the user explicitly configured. Ignored on POST/PATCH.
     * 
     * @type {MonitorV2Scheduling}
     * @memberof MonitorV2
     */
    readonly effectiveScheduling?: MonitorV2Scheduling;
}


/**
 * The configuration of an action. `type` selects which payload applies:
 * `Email` uses `email`, while `Webhook`, `Slack` and `PagerDuty` all use
 * `webhook`. A PagerDuty action is a webhook posted to the PagerDuty
 * Events API, so its routing key is a field of the JSON template in
 * `webhook.body` rather than a property of its own.
 * 
 * @export
 * @interface MonitorV2ActionDefinition
 */
export interface MonitorV2ActionDefinition {
    /**
     * True when the action is private to its monitor, false when it is a
     * shared action bound by `actionId`. Only an inline action's
     * definition is written by a monitor create or update.
     * 
     * @type {boolean}
     * @memberof MonitorV2ActionDefinition
     */
    inline?: boolean;
    /**
     * Names a shared action. An inline action is named internally: reads
     * do not return one and any value sent is replaced, so it may be
     * omitted for inline actions.
     * 
     * @type {string}
     * @memberof MonitorV2ActionDefinition
     */
    name?: string;
    /**
     * 
     * @type {MonitorV2ActionType}
     * @memberof MonitorV2ActionDefinition
     */
    type: MonitorV2ActionType;
    /**
     * 
     * @type {MonitorV2EmailAction}
     * @memberof MonitorV2ActionDefinition
     */
    email?: MonitorV2EmailAction;
    /**
     * 
     * @type {MonitorV2WebhookAction}
     * @memberof MonitorV2ActionDefinition
     */
    webhook?: MonitorV2WebhookAction;
}


/**
 * Either the actionId or the definition must be present when setting.
 * The actionId references an existing shared action, while the
 * definition would be used to configure an inline (private to a monitor)
 * action. A read returns both: the actionId of the bound action and, for
 * an inline action, the definition that can be edited and sent back.
 * 
 * @export
 * @interface MonitorV2ActionRule
 */
export interface MonitorV2ActionRule {
    /**
     * 
     * @type {string}
     * @memberof MonitorV2ActionRule
     */
    actionId?: string;
    /**
     * 
     * @type {MonitorV2AlarmLevel}
     * @memberof MonitorV2ActionRule
     */
    levels?: MonitorV2AlarmLevel;
    /**
     * 
     * @type {MonitorV2ComparisonExpression}
     * @memberof MonitorV2ActionRule
     */
    conditions?: MonitorV2ComparisonExpression;
    /**
     * 
     * @type {boolean}
     * @memberof MonitorV2ActionRule
     */
    sendEndNotifications?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof MonitorV2ActionRule
     */
    sendRemindersInterval?: boolean;
    /**
     * 
     * @type {MonitorV2ActionDefinition}
     * @memberof MonitorV2ActionRule
     */
    definition?: MonitorV2ActionDefinition;
}


/**
 * 
 * @export
 * @enum {string}
 */
export enum MonitorV2ActionType {
    Email = 'Email',
    PagerDuty = 'PagerDuty',
    Slack = 'Slack',
    Webhook = 'Webhook'
}

/**
 * 
 * @export
 * @enum {string}
 */
export enum MonitorV2AlarmLevel {
    Critical = 'Critical',
    Error = 'Error',
    Informational = 'Informational',
    None = 'None',
    Warning = 'Warning'
}

/**
 * 
 * @export
 * @enum {string}
 */
export enum MonitorV2BooleanOperator {
    And = 'And',
    Or = 'Or'
}

/**
 * Identifies a column in a monitor's input pipeline. At most one of
 * `linkColumn`, `columnPath`, and `correlationTag` may be set; the
 * save-time validator rejects violations of this one-of contract.
 * 
 * @export
 * @interface MonitorV2Column
 */
export interface MonitorV2Column {
    /**
     * 
     * @type {MonitorV2LinkColumn}
     * @memberof MonitorV2Column
     */
    linkColumn?: MonitorV2LinkColumn;
    /**
     * 
     * @type {MonitorV2ColumnPath}
     * @memberof MonitorV2Column
     */
    columnPath?: MonitorV2ColumnPath;
    /**
     * 
     * @type {MonitorV2CorrelationTag}
     * @memberof MonitorV2Column
     */
    correlationTag?: MonitorV2CorrelationTag;
}
/**
 * 
 * @export
 * @interface MonitorV2ColumnComparison
 */
export interface MonitorV2ColumnComparison {
    /**
     * 
     * @type {Array<MonitorV2Comparison>}
     * @memberof MonitorV2ColumnComparison
     */
    compareValues?: Array<MonitorV2Comparison>;
    /**
     * 
     * @type {MonitorV2Column}
     * @memberof MonitorV2ColumnComparison
     */
    column?: MonitorV2Column;
}
/**
 * 
 * @export
 * @interface MonitorV2ColumnPath
 */
export interface MonitorV2ColumnPath {
    /**
     * 
     * @type {string}
     * @memberof MonitorV2ColumnPath
     */
    name?: string;
    /**
     * 
     * @type {string}
     * @memberof MonitorV2ColumnPath
     */
    path?: string;
}
/**
 * 
 * @export
 * @interface MonitorV2Comparison
 */
export interface MonitorV2Comparison {
    /**
     * 
     * @type {MonitorV2ComparisonFunction}
     * @memberof MonitorV2Comparison
     */
    compareFn?: MonitorV2ComparisonFunction;
    /**
     * 
     * @type {PrimitiveValue}
     * @memberof MonitorV2Comparison
     */
    compareValue?: PrimitiveValue;
}


/**
 * 
 * @export
 * @interface MonitorV2ComparisonExpression
 */
export interface MonitorV2ComparisonExpression {
    /**
     * 
     * @type {MonitorV2BooleanOperator}
     * @memberof MonitorV2ComparisonExpression
     */
    operator?: MonitorV2BooleanOperator;
    /**
     * 
     * @type {Array<MonitorV2ComparisonExpression>}
     * @memberof MonitorV2ComparisonExpression
     */
    subExpressions?: Array<MonitorV2ComparisonExpression>;
    /**
     * 
     * @type {Array<MonitorV2ComparisonTerm>}
     * @memberof MonitorV2ComparisonExpression
     */
    compareTerms?: Array<MonitorV2ComparisonTerm>;
}


/**
 * 
 * @export
 * @enum {string}
 */
export enum MonitorV2ComparisonFunction {
    Contains = 'Contains',
    Equal = 'Equal',
    Greater = 'Greater',
    GreaterOrEqual = 'GreaterOrEqual',
    Less = 'Less',
    LessOrEqual = 'LessOrEqual',
    NotContains = 'NotContains',
    NotEqual = 'NotEqual',
    NotStartsWith = 'NotStartsWith',
    StartsWith = 'StartsWith'
}

/**
 * 
 * @export
 * @interface MonitorV2ComparisonTerm
 */
export interface MonitorV2ComparisonTerm {
    /**
     * 
     * @type {MonitorV2Comparison}
     * @memberof MonitorV2ComparisonTerm
     */
    comparison: MonitorV2Comparison;
    /**
     * 
     * @type {MonitorV2Column}
     * @memberof MonitorV2ComparisonTerm
     */
    column: MonitorV2Column;
}
/**
 * Marker on a `MonitorV2Column` indicating that the column is grouping by a
 * correlation tag (e.g. `service.name`) rather than a specific physical
 * column. The per-column struct carries the tag name and optional resolution
 * `meta`; the authoritative `(tag, backing-column)` mapping for every
 * correlation tag in the schema lives on `MonitorV2AlertSchema.correlationTags`.
 * 
 * @export
 * @interface MonitorV2CorrelationTag
 */
export interface MonitorV2CorrelationTag {
    /**
     * Correlation tag name, without the leading `#`. The save-time resolver
     * expands this into the canonical primary backing column picked by the
     * OPAL coalesce ordering and records the `(tag, column)` pair on
     * `MonitorV2AlertSchema.correlationTags`; this column itself carries
     * only the tag identifier.
     * 
     * @type {string}
     * @memberof MonitorV2CorrelationTag
     */
    tag?: string;
    /**
     * 
     * @type {MonitorV2CorrelationTagMeta}
     * @memberof MonitorV2CorrelationTag
     */
    meta?: MonitorV2CorrelationTagMeta;
}
/**
 * Optional resolution context surfaced for frontend preview/display: the
 * physical backing columns the tag resolves to.
 * 
 * @export
 * @interface MonitorV2CorrelationTagMeta
 */
export interface MonitorV2CorrelationTagMeta {
    /**
     * 
     * @type {Array<MonitorV2ColumnPath>}
     * @memberof MonitorV2CorrelationTagMeta
     */
    srcFields?: Array<MonitorV2ColumnPath>;
}
/**
 * 
 * @export
 * @interface MonitorV2CountRule
 */
export interface MonitorV2CountRule {
    /**
     * 
     * @type {Array<MonitorV2Comparison>}
     * @memberof MonitorV2CountRule
     */
    compareValues: Array<MonitorV2Comparison>;
    /**
     * 
     * @type {Array<MonitorV2ColumnComparison>}
     * @memberof MonitorV2CountRule
     */
    compareGroups?: Array<MonitorV2ColumnComparison>;
}
/**
 * 
 * @export
 * @interface MonitorV2CronSchedule
 */
export interface MonitorV2CronSchedule {
    /**
     * Crontab configuration for wall-clock scheduled evaluation.
     * @type {string}
     * @memberof MonitorV2CronSchedule
     */
    cronConfig?: string;
    /**
     * IANA timezone for interpreting cronConfig on the wall clock.
     * @type {string}
     * @memberof MonitorV2CronSchedule
     */
    timezone: string;
    /**
     * 
     * @type {MonitorV2CronScheduleAlarmMode}
     * @memberof MonitorV2CronSchedule
     */
    alarmMode?: MonitorV2CronScheduleAlarmMode;
}


/**
 * Controls how alarms are emitted across consecutive monitor evaluations. PerRun (the default when omitted) emits an independent zero-duration alarm per firing evaluation. Ongoing causes consecutive evaluations that re-assert the same (group, level) to extend a single ongoing alarm. Setting the value to Ongoing is gated by a customer feature flag.
 * 
 * @export
 * @enum {string}
 */
export enum MonitorV2CronScheduleAlarmMode {
    PerRun = 'PerRun',
    Ongoing = 'Ongoing'
}

/**
 * 
 * @export
 * @interface MonitorV2Definition
 */
export interface MonitorV2Definition {
    /**
     * 
     * @type {MultiStageQuery}
     * @memberof MonitorV2Definition
     */
    inputQuery: MultiStageQuery;
    /**
     * 
     * @type {Array<MonitorV2Rule>}
     * @memberof MonitorV2Definition
     */
    rules: Array<MonitorV2Rule>;
    /**
     * 
     * @type {string}
     * @memberof MonitorV2Definition
     */
    lookbackTime?: string;
    /**
     * 
     * @type {string}
     * @memberof MonitorV2Definition
     */
    dataStabilizationDelay?: string;
    /**
     * 
     * @type {number}
     * @memberof MonitorV2Definition
     */
    maxAlertsPerHour?: number;
    /**
     * 
     * @type {Array<MonitorV2Column>}
     * @memberof MonitorV2Definition
     */
    groupings?: Array<MonitorV2Column>;
    /**
     * User-specified scheduling preference. When read back via GET, this reflects only what the user explicitly set, not the scheduling mode the backend is actually using. Null or omitted means the system chooses the best mode automatically. To see the resolved scheduling mode, use the top-level effectiveScheduling field instead.
     * 
     * @type {MonitorV2Scheduling}
     * @memberof MonitorV2Definition
     */
    scheduling?: MonitorV2Scheduling;
    /**
     * No-data rules that fire at NoData severity when no data arrives for the full lookback window. At most one entry for threshold monitors.
     * 
     * @type {Array<MonitorV2NoDataRule>}
     * @memberof MonitorV2Definition
     */
    noDataRules?: Array<MonitorV2NoDataRule>;
}
/**
 * 
 * @export
 * @interface MonitorV2EmailAction
 */
export interface MonitorV2EmailAction {
    /**
     * 
     * @type {Array<string>}
     * @memberof MonitorV2EmailAction
     */
    users?: Array<string>;
    /**
     * 
     * @type {Array<string>}
     * @memberof MonitorV2EmailAction
     */
    addresses?: Array<string>;
    /**
     * 
     * @type {string}
     * @memberof MonitorV2EmailAction
     */
    subject: string;
    /**
     * 
     * @type {string}
     * @memberof MonitorV2EmailAction
     */
    body?: string;
    /**
     * 
     * @type {object}
     * @memberof MonitorV2EmailAction
     */
    fragments?: object;
}
/**
 * The monitor's operating state as one value, computed from its last
 * evaluation and from its cluster's failover role. Resolved by priority,
 * highest first:
 * 
 * | Value | Meaning |
 * |---|---|
 * | `Disabled` | Turned off, whether by a user or by a spend or alert-rate limit. |
 * | `ClusterPassive` | Its customer's monitoring is not active on this cluster, so nothing evaluates. Set for every monitor of that customer at once. |
 * | `Failed` | The monitor logged an error since its last run, less than a week ago. |
 * | `Warnings` | The monitor logged a warning in that same window. |
 * | `Initializing` | An anomaly monitor has not yet produced its output dataset, so it cannot evaluate. |
 * | `Running` | Nothing above applies. |
 * 
 * A monitor can satisfy several; the API reports only the highest, and the
 * ranking may change.
 * 
 * A monitor that a limit turned off reports plain `Disabled` here. The
 * monitors list API separates those causes into `CostDisabled`,
 * `AlertRateLimitDisabled` and `AtRisk` in its own `MonitorHealth` enum;
 * this one omits them.
 * 
 * @export
 * @enum {string}
 */
export enum MonitorV2Health {
    ClusterPassive = 'ClusterPassive',
    Disabled = 'Disabled',
    Failed = 'Failed',
    Initializing = 'Initializing',
    Running = 'Running',
    Warnings = 'Warnings'
}

/**
 * The http type describes the method or verb to use in http webhooks.
 * note: As a convenience, the values POST and PUT will be accepted, but converted
 * to the enumeration values Post and Put respectively.
 * 
 * @export
 * @enum {string}
 */
export enum MonitorV2HttpType {
    Post = 'Post',
    Put = 'Put'
}

/**
 * 
 * @export
 * @interface MonitorV2LinkColumn
 */
export interface MonitorV2LinkColumn {
    /**
     * 
     * @type {string}
     * @memberof MonitorV2LinkColumn
     */
    name?: string;
    /**
     * 
     * @type {MonitorV2LinkColumnMeta}
     * @memberof MonitorV2LinkColumn
     */
    meta?: MonitorV2LinkColumnMeta;
}
/**
 * 
 * @export
 * @interface MonitorV2LinkColumnMeta
 */
export interface MonitorV2LinkColumnMeta {
    /**
     * 
     * @type {Array<MonitorV2ColumnPath>}
     * @memberof MonitorV2LinkColumnMeta
     */
    srcFields?: Array<MonitorV2ColumnPath>;
    /**
     * 
     * @type {Array<string>}
     * @memberof MonitorV2LinkColumnMeta
     */
    dstFields?: Array<string>;
    /**
     * 
     * @type {Array<string>}
     * @memberof MonitorV2LinkColumnMeta
     */
    targetDataset?: Array<string>;
}
/**
 * 
 * @export
 * @interface MonitorV2MuteRule
 */
export interface MonitorV2MuteRule {
    /**
     * 
     * @type {MonitorV2MuteRuleSchedule}
     * @memberof MonitorV2MuteRule
     */
    schedule: MonitorV2MuteRuleSchedule;
    /**
     * 
     * @type {MonitorV2ComparisonExpression}
     * @memberof MonitorV2MuteRule
     */
    criteria?: MonitorV2ComparisonExpression;
    /**
     * 
     * @type {string}
     * @memberof MonitorV2MuteRule
     */
    readonly validFrom: string;
    /**
     * 
     * @type {string}
     * @memberof MonitorV2MuteRule
     */
    readonly validTo?: string;
    /**
     * 
     * @type {string}
     * @memberof MonitorV2MuteRule
     */
    monitorID?: string;
    /**
     * 
     * @type {MonitorV2MuteRuleMonitor}
     * @memberof MonitorV2MuteRule
     */
    monitor?: MonitorV2MuteRuleMonitor;
    /**
     * 
     * @type {string}
     * @memberof MonitorV2MuteRule
     */
    readonly id: string;
    /**
     * 
     * @type {string}
     * @memberof MonitorV2MuteRule
     */
    name: string;
    /**
     * 
     * @type {boolean}
     * @memberof MonitorV2MuteRule
     */
    readonly isGlobal?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof MonitorV2MuteRule
     */
    readonly isConditional?: boolean;
}
/**
 * 
 * @export
 * @interface MonitorV2MuteRuleMonitor
 */
export interface MonitorV2MuteRuleMonitor {
    /**
     * 
     * @type {string}
     * @memberof MonitorV2MuteRuleMonitor
     */
    id?: string;
    /**
     * 
     * @type {string}
     * @memberof MonitorV2MuteRuleMonitor
     */
    name?: string;
}
/**
 * 
 * @export
 * @interface MonitorV2MuteRuleSchedule
 */
export interface MonitorV2MuteRuleSchedule {
    /**
     * 
     * @type {MonitorV2MuteScheduleType}
     * @memberof MonitorV2MuteRuleSchedule
     */
    type: MonitorV2MuteScheduleType;
    /**
     * 
     * @type {MonitorV2OneTimeMuteSchedule}
     * @memberof MonitorV2MuteRuleSchedule
     */
    oneTime?: MonitorV2OneTimeMuteSchedule;
}


/**
 * 
 * @export
 * @interface MonitorV2MuteRuleScheduleTerse
 */
export interface MonitorV2MuteRuleScheduleTerse {
    /**
     * 
     * @type {MonitorV2MuteScheduleType}
     * @memberof MonitorV2MuteRuleScheduleTerse
     */
    type: MonitorV2MuteScheduleType;
}


/**
 * 
 * @export
 * @interface MonitorV2MuteRuleTerse
 */
export interface MonitorV2MuteRuleTerse {
    /**
     * 
     * @type {MonitorV2MuteRuleScheduleTerse}
     * @memberof MonitorV2MuteRuleTerse
     */
    schedule: MonitorV2MuteRuleScheduleTerse;
    /**
     * 
     * @type {string}
     * @memberof MonitorV2MuteRuleTerse
     */
    readonly validFrom: string;
    /**
     * 
     * @type {string}
     * @memberof MonitorV2MuteRuleTerse
     */
    readonly validTo?: string;
    /**
     * 
     * @type {string}
     * @memberof MonitorV2MuteRuleTerse
     */
    monitorID?: string;
    /**
     * 
     * @type {string}
     * @memberof MonitorV2MuteRuleTerse
     */
    readonly id: string;
    /**
     * 
     * @type {string}
     * @memberof MonitorV2MuteRuleTerse
     */
    name: string;
    /**
     * 
     * @type {boolean}
     * @memberof MonitorV2MuteRuleTerse
     */
    readonly isGlobal?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof MonitorV2MuteRuleTerse
     */
    readonly isConditional?: boolean;
}
/**
 * 
 * @export
 * @enum {string}
 */
export enum MonitorV2MuteScheduleType {
    OneTime = 'OneTime'
}

/**
 * 
 * @export
 * @interface MonitorV2NoDataRule
 */
export interface MonitorV2NoDataRule {
    /**
     * How long the no-data alarm persists before auto-resolving. Omit for the backend default (~24 hours).
     * 
     * @type {string}
     * @memberof MonitorV2NoDataRule
     */
    expiration?: string;
    /**
     * Threshold configuration. valueColumnName and aggregation must match the monitor's regular rules. compareValues must be empty.
     * 
     * @type {MonitorV2ThresholdRule}
     * @memberof MonitorV2NoDataRule
     */
    threshold?: MonitorV2ThresholdRule;
}
/**
 * 
 * @export
 * @interface MonitorV2OneTimeMuteSchedule
 */
export interface MonitorV2OneTimeMuteSchedule {
    /**
     * 
     * @type {string}
     * @memberof MonitorV2OneTimeMuteSchedule
     */
    startTime: string;
    /**
     * 
     * @type {string}
     * @memberof MonitorV2OneTimeMuteSchedule
     */
    endTime?: string;
}
/**
 * Request body for `PATCH .../monitors/{id}`. Every property is optional. Only these
 * top-level keys participate in the update; see the operation description for merge vs
 * whole-value replacement rules.
 * 
 * @export
 * @interface MonitorV2PatchRequest
 */
export interface MonitorV2PatchRequest {
    /**
     * 
     * @type {string}
     * @memberof MonitorV2PatchRequest
     */
    name?: string;
    /**
     * 
     * @type {boolean}
     * @memberof MonitorV2PatchRequest
     */
    disabled?: boolean;
    /**
     * 
     * @type {string}
     * @memberof MonitorV2PatchRequest
     */
    description?: string;
    /**
     * 
     * @type {MonitorV2RuleKind}
     * @memberof MonitorV2PatchRequest
     */
    ruleKind?: MonitorV2RuleKind;
    /**
     * 
     * @type {MonitorV2Definition}
     * @memberof MonitorV2PatchRequest
     */
    definition?: MonitorV2Definition;
    /**
     * 
     * @type {Array<MonitorV2ActionRule>}
     * @memberof MonitorV2PatchRequest
     */
    actionRules?: Array<MonitorV2ActionRule>;
}


/**
 * 
 * @export
 * @interface MonitorV2PromoteRule
 */
export interface MonitorV2PromoteRule {
    /**
     * 
     * @type {Array<MonitorV2ColumnComparison>}
     * @memberof MonitorV2PromoteRule
     */
    compareColumns?: Array<MonitorV2ColumnComparison>;
}
/**
 * 
 * @export
 * @interface MonitorV2Rule
 */
export interface MonitorV2Rule {
    /**
     * 
     * @type {MonitorV2AlarmLevel}
     * @memberof MonitorV2Rule
     */
    level?: MonitorV2AlarmLevel;
    /**
     * 
     * @type {MonitorV2CountRule}
     * @memberof MonitorV2Rule
     */
    count?: MonitorV2CountRule;
    /**
     * 
     * @type {MonitorV2ThresholdRule}
     * @memberof MonitorV2Rule
     */
    threshold?: MonitorV2ThresholdRule;
    /**
     * 
     * @type {MonitorV2PromoteRule}
     * @memberof MonitorV2Rule
     */
    promote?: MonitorV2PromoteRule;
}


/**
 * 
 * @export
 * @enum {string}
 */
export enum MonitorV2RuleKind {
    Anomaly = 'Anomaly',
    Count = 'Count',
    Promote = 'Promote',
    Threshold = 'Threshold'
}

/**
 * Scheduling modes are mutually exclusive. Omit both transform and scheduled for service-chosen defaults. Set transform for continuous transform-driven evaluation, or scheduled for cron-based wall-clock evaluation.
 * 
 * @export
 * @interface MonitorV2Scheduling
 */
export interface MonitorV2Scheduling {
    /**
     * 
     * @type {MonitorV2TransformSchedule}
     * @memberof MonitorV2Scheduling
     */
    transform?: MonitorV2TransformSchedule;
    /**
     * 
     * @type {MonitorV2CronSchedule}
     * @memberof MonitorV2Scheduling
     */
    scheduled?: MonitorV2CronSchedule;
}
/**
 * 
 * @export
 * @interface MonitorV2ThresholdRule
 */
export interface MonitorV2ThresholdRule {
    /**
     * 
     * @type {Array<MonitorV2Comparison>}
     * @memberof MonitorV2ThresholdRule
     */
    compareValues: Array<MonitorV2Comparison>;
    /**
     * 
     * @type {string}
     * @memberof MonitorV2ThresholdRule
     */
    valueColumnName: string;
    /**
     * 
     * @type {MonitorV2ValueAggregation}
     * @memberof MonitorV2ThresholdRule
     */
    aggregation: MonitorV2ValueAggregation;
    /**
     * 
     * @type {Array<MonitorV2ColumnComparison>}
     * @memberof MonitorV2ThresholdRule
     */
    compareGroups?: Array<MonitorV2ColumnComparison>;
}


/**
 * 
 * @export
 * @interface MonitorV2TransformSchedule
 */
export interface MonitorV2TransformSchedule {
    /**
     * 
     * @type {string}
     * @memberof MonitorV2TransformSchedule
     */
    freshnessGoal?: string;
}
/**
 * 
 * @export
 * @enum {string}
 */
export enum MonitorV2ValueAggregation {
    AllOf = 'AllOf',
    AnyOf = 'AnyOf',
    AvgOf = 'AvgOf',
    SumOf = 'SumOf'
}

/**
 * 
 * @export
 * @interface MonitorV2WebhookAction
 */
export interface MonitorV2WebhookAction {
    /**
     * 
     * @type {string}
     * @memberof MonitorV2WebhookAction
     */
    url: string;
    /**
     * 
     * @type {MonitorV2HttpType}
     * @memberof MonitorV2WebhookAction
     */
    method: MonitorV2HttpType;
    /**
     * 
     * @type {Array<MonitorV2WebhookHeader>}
     * @memberof MonitorV2WebhookAction
     */
    headers?: Array<MonitorV2WebhookHeader>;
    /**
     * 
     * @type {string}
     * @memberof MonitorV2WebhookAction
     */
    body: string;
    /**
     * 
     * @type {object}
     * @memberof MonitorV2WebhookAction
     */
    fragments?: object;
}


/**
 * 
 * @export
 * @interface MonitorV2WebhookHeader
 */
export interface MonitorV2WebhookHeader {
    /**
     * 
     * @type {string}
     * @memberof MonitorV2WebhookHeader
     */
    header: string;
    /**
     * 
     * @type {string}
     * @memberof MonitorV2WebhookHeader
     */
    value: string;
}
/**
 * 
 * @export
 * @interface MultiStageQuery
 */
export interface MultiStageQuery {
    /**
     * 
     * @type {string}
     * @memberof MultiStageQuery
     */
    outputStage: string;
    /**
     * 
     * @type {Array<StageQuery>}
     * @memberof MultiStageQuery
     */
    stages: Array<StageQuery>;
}
/**
 * 
 * @export
 * @interface OAuthExternalIntegrationRef
 */
export interface OAuthExternalIntegrationRef {
    /**
     * 
     * @type {string}
     * @memberof OAuthExternalIntegrationRef
     */
    id: string;
}
/**
 * Brief record fields for an ObjectRef. This type is polymorphic: additional fields pointing to specific object types (e.g. dataset, dashboard, monitor) may be added in the future as needed.
 * 
 * @export
 * @interface ObjectBrief
 */
export interface ObjectBrief {
    /**
     * 
     * @type {string}
     * @memberof ObjectBrief
     */
    label: string;
    /**
     * 
     * @type {string}
     * @memberof ObjectBrief
     */
    description: string;
    /**
     * 
     * @type {string}
     * @memberof ObjectBrief
     */
    iconUrl: string;
    /**
     * 
     * @type {ObjectRef}
     * @memberof ObjectBrief
     */
    managedBy: ObjectRef | null;
}
/**
 * A reference to another resource. Always carries the id; the optional `record` field carries the brief metadata, populated when expand=true. Brief expansion applies to one layer only — fields inside `record` that are themselves ObjectRefs (e.g. `record.managedBy`) are returned id-only, never with their own `record` populated. CEL filter expressions can deeper-resolve via lazy wrapper resolution if needed.
 * 
 * @export
 * @interface ObjectRef
 */
export interface ObjectRef {
    /**
     * 
     * @type {string}
     * @memberof ObjectRef
     */
    id: string;
    /**
     * 
     * @type {ObjectBrief}
     * @memberof ObjectRef
     */
    record?: ObjectBrief;
}
/**
 * 
 * @export
 * @interface ObjectTagKey
 */
export interface ObjectTagKey {
    /**
     * The tag key
     * @type {string}
     * @memberof ObjectTagKey
     */
    key: string;
    /**
     * Number of objects with this tag key
     * @type {number}
     * @memberof ObjectTagKey
     */
    count: number;
}
/**
 * 
 * @export
 * @interface ObjectTagKeysSearchResponse
 */
export interface ObjectTagKeysSearchResponse {
    /**
     * Unique tag keys with counts, sorted by count descending then alphabetically
     * @type {Array<ObjectTagKey>}
     * @memberof ObjectTagKeysSearchResponse
     */
    results: Array<ObjectTagKey>;
}
/**
 * 
 * @export
 * @interface ObjectTagValue
 */
export interface ObjectTagValue {
    /**
     * The tag value
     * @type {string}
     * @memberof ObjectTagValue
     */
    value: string;
    /**
     * Number of objects with this tag key-value pair
     * @type {number}
     * @memberof ObjectTagValue
     */
    count: number;
}
/**
 * 
 * @export
 * @interface ObjectTagValuesSearchResponse
 */
export interface ObjectTagValuesSearchResponse {
    /**
     * Unique values with counts, sorted by count descending then alphabetically
     * @type {Array<ObjectTagValue>}
     * @memberof ObjectTagValuesSearchResponse
     */
    results: Array<ObjectTagValue>;
}
/**
 * A time range with a start and/or end time.
 * @export
 * @interface OpenTimeRange
 */
export interface OpenTimeRange {
    /**
     * 
     * @type {string}
     * @memberof OpenTimeRange
     */
    startTime: string | null;
    /**
     * 
     * @type {string}
     * @memberof OpenTimeRange
     */
    endTime: string | null;
}
/**
 * A viewer-controllable value that cards reference from OPAL as
 * `$parameterId`. `valueKind` fixes what sort of value it holds and
 * `viewType` chooses the input control. Dashboards can place a parameter
 * on the grid as a card; worksheets cannot.
 * 
 * @export
 * @interface Parameter
 */
export interface Parameter {
    /**
     * 
     * @type {string}
     * @memberof Parameter
     */
    id: string;
    /**
     * 
     * @type {string}
     * @memberof Parameter
     */
    label: string;
    /**
     * 
     * @type {ParameterViewType}
     * @memberof Parameter
     */
    viewType?: ParameterViewType;
    /**
     * 
     * @type {ValueKind}
     * @memberof Parameter
     */
    valueKind: ValueKind;
    /**
     * Default `true`. Omit when default.
     * @type {boolean}
     * @memberof Parameter
     */
    allowEmpty?: boolean;
    /**
     * When `true`, the parameter's input control is not rendered to
     * viewers; the parameter still drives queries and (per the
     * hide-sections feature) section visibility. Set only at creation
     * time. Default `false`. Omit when default.
     * 
     * @type {boolean}
     * @memberof Parameter
     */
    hidden?: boolean;
    /**
     * The parameter's default value, as a tagged object with exactly
     * one key naming the value's type. For a string parameter,
     * `{ "string": null }` means an empty control that encodes as OPAL
     * null, while `{ "string": "" }` encodes as an empty string. Omit
     * when there is no default.
     * 
     * @type {ParameterDefaultValue}
     * @memberof Parameter
     */
    defaultValue?: ParameterDefaultValue;
    /**
     * 
     * @type {string}
     * @memberof Parameter
     */
    customEmptyValueLabel?: string | null;
}


/**
 * 
 * @export
 * @interface ParameterArrayInner
 */
export interface ParameterArrayInner {
    /**
     * 
     * @type {string}
     * @memberof ParameterArrayInner
     */
    id: string;
    /**
     * 
     * @type {string}
     * @memberof ParameterArrayInner
     */
    name?: string;
    /**
     * 
     * @type {ParameterArrayInnerDefaultValue}
     * @memberof ParameterArrayInner
     */
    defaultValue: ParameterArrayInnerDefaultValue;
    /**
     * 
     * @type {ParameterArrayInnerValueKind}
     * @memberof ParameterArrayInner
     */
    valueKind: ParameterArrayInnerValueKind;
}
/**
 * 
 * @export
 * @interface ParameterArrayInnerDefaultValue
 */
export interface ParameterArrayInnerDefaultValue {
    /**
     * 
     * @type {boolean}
     * @memberof ParameterArrayInnerDefaultValue
     */
    bool?: boolean;
    /**
     * 
     * @type {number}
     * @memberof ParameterArrayInnerDefaultValue
     */
    float64?: number;
    /**
     * 
     * @type {string}
     * @memberof ParameterArrayInnerDefaultValue
     */
    int64?: string;
    /**
     * 
     * @type {string}
     * @memberof ParameterArrayInnerDefaultValue
     */
    string?: string;
    /**
     * 
     * @type {string}
     * @memberof ParameterArrayInnerDefaultValue
     */
    timestamp?: string;
    /**
     * 
     * @type {string}
     * @memberof ParameterArrayInnerDefaultValue
     */
    duration?: string;
    /**
     * 
     * @type {string}
     * @memberof ParameterArrayInnerDefaultValue
     */
    nullValueType?: string;
}
/**
 * 
 * @export
 * @interface ParameterArrayInnerValueKind
 */
export interface ParameterArrayInnerValueKind {
    /**
     * 
     * @type {string}
     * @memberof ParameterArrayInnerValueKind
     */
    type: string;
}
/**
 * 
 * @export
 * @interface ParameterDefaultValue
 */
export interface ParameterDefaultValue {
    /**
     * 
     * @type {boolean}
     * @memberof ParameterDefaultValue
     */
    bool?: boolean;
    /**
     * 
     * @type {number}
     * @memberof ParameterDefaultValue
     */
    float64?: number;
    /**
     * 
     * @type {ParameterDefaultValueCellInt64}
     * @memberof ParameterDefaultValue
     */
    int64?: ParameterDefaultValueCellInt64 | null;
    /**
     * 
     * @type {string}
     * @memberof ParameterDefaultValue
     */
    string?: string | null;
    /**
     * 
     * @type {string}
     * @memberof ParameterDefaultValue
     */
    timestamp?: string;
    /**
     * 
     * @type {string}
     * @memberof ParameterDefaultValue
     */
    duration?: string;
    /**
     * 
     * @type {ParameterDefaultValueArray}
     * @memberof ParameterDefaultValue
     */
    array?: ParameterDefaultValueArray;
    /**
     * 
     * @type {ParameterDefaultValueLink}
     * @memberof ParameterDefaultValue
     */
    link?: ParameterDefaultValueLink;
    /**
     * 
     * @type {ParameterDefaultValueDatasetRef}
     * @memberof ParameterDefaultValue
     */
    datasetref?: ParameterDefaultValueDatasetRef;
    /**
     * 
     * @type {string}
     * @memberof ParameterDefaultValue
     */
    nullValueType?: string;
}
/**
 * A list of values. JSON `null` means empty. Otherwise an object
 * with a `value` array — not a bare JSON array. Items are scalar
 * cells; nested arrays and resource links are not allowed.
 * 
 * @export
 * @interface ParameterDefaultValueArray
 */
export interface ParameterDefaultValueArray {
    /**
     * 
     * @type {Array<ParameterDefaultValueCell>}
     * @memberof ParameterDefaultValueArray
     */
    value?: Array<ParameterDefaultValueCell>;
}
/**
 * 
 * @export
 * @interface ParameterDefaultValueCell
 */
export interface ParameterDefaultValueCell {
    /**
     * 
     * @type {boolean}
     * @memberof ParameterDefaultValueCell
     */
    bool?: boolean;
    /**
     * 
     * @type {number}
     * @memberof ParameterDefaultValueCell
     */
    float64?: number;
    /**
     * 
     * @type {ParameterDefaultValueCellInt64}
     * @memberof ParameterDefaultValueCell
     */
    int64?: ParameterDefaultValueCellInt64 | null;
    /**
     * 
     * @type {string}
     * @memberof ParameterDefaultValueCell
     */
    string?: string | null;
    /**
     * 
     * @type {string}
     * @memberof ParameterDefaultValueCell
     */
    timestamp?: string;
    /**
     * 
     * @type {string}
     * @memberof ParameterDefaultValueCell
     */
    duration?: string;
    /**
     * 
     * @type {ParameterDefaultValueDatasetRef}
     * @memberof ParameterDefaultValueCell
     */
    datasetref?: ParameterDefaultValueDatasetRef;
    /**
     * 
     * @type {string}
     * @memberof ParameterDefaultValueCell
     */
    nullValueType?: string;
}
/**
 * A 64-bit integer. Normally a decimal string, which preserves
 * full precision; may also be a JSON number or `null`.
 * 
 * @export
 * @interface ParameterDefaultValueCellInt64
 */
export interface ParameterDefaultValueCellInt64 {
}
/**
 * 
 * @export
 * @interface ParameterDefaultValueDatasetRef
 */
export interface ParameterDefaultValueDatasetRef {
    /**
     * 
     * @type {string}
     * @memberof ParameterDefaultValueDatasetRef
     */
    datasetId?: string;
    /**
     * 
     * @type {string}
     * @memberof ParameterDefaultValueDatasetRef
     */
    datasetPath?: string;
    /**
     * 
     * @type {string}
     * @memberof ParameterDefaultValueDatasetRef
     */
    stageId?: string;
}
/**
 * A resource-instance value, or JSON `null` when unset.
 * 
 * @export
 * @interface ParameterDefaultValueLink
 */
export interface ParameterDefaultValueLink {
    /**
     * 
     * @type {string}
     * @memberof ParameterDefaultValueLink
     */
    datasetId?: string;
    /**
     * 
     * @type {string}
     * @memberof ParameterDefaultValueLink
     */
    storedLabel?: string;
    /**
     * 
     * @type {Array<ParameterDefaultValueLinkPrimaryKeyValueInner>}
     * @memberof ParameterDefaultValueLink
     */
    primaryKeyValue?: Array<ParameterDefaultValueLinkPrimaryKeyValueInner>;
}
/**
 * 
 * @export
 * @interface ParameterDefaultValueLinkPrimaryKeyValueInner
 */
export interface ParameterDefaultValueLinkPrimaryKeyValueInner {
    /**
     * 
     * @type {string}
     * @memberof ParameterDefaultValueLinkPrimaryKeyValueInner
     */
    name: string;
    /**
     * 
     * @type {ParameterDefaultValueCell}
     * @memberof ParameterDefaultValueLinkPrimaryKeyValueInner
     */
    value?: ParameterDefaultValueCell;
}
/**
 * 
 * @export
 * @interface ParameterValueArrayInner
 */
export interface ParameterValueArrayInner {
    /**
     * 
     * @type {string}
     * @memberof ParameterValueArrayInner
     */
    id: string;
    /**
     * 
     * @type {ParameterArrayInnerDefaultValue}
     * @memberof ParameterValueArrayInner
     */
    value: ParameterArrayInnerDefaultValue;
}
/**
 * UI widget hint. Defaults vary by `valueKind.kind`:
 * - `resource` → `resourceInput`
 * - `scalar` with a `valueSource` → `singleSelect`
 * - `scalar` without → `textInput`
 * Omit when the default applies.
 * 
 * @export
 * @enum {string}
 */
export enum ParameterViewType {
    ResourceInput = 'resourceInput',
    Dropdown = 'dropdown',
    TextInput = 'textInput',
    NumberInput = 'numberInput',
    SingleSelect = 'singleSelect',
    MultiSelect = 'multiSelect'
}

/**
 * Pie / donut chart options. `key` picks the column that divides the
 * circle into slices and `value` the column that sizes them, so the
 * encoding is the key/value pair TopList uses rather than x/y.
 * 
 * @export
 * @interface PieOptions
 */
export interface PieOptions {
    /**
     * 
     * @type {FieldRef}
     * @memberof PieOptions
     */
    key?: FieldRef;
    /**
     * 
     * @type {FieldRef}
     * @memberof PieOptions
     */
    value?: FieldRef;
    /**
     * 
     * @type {PieOptionsKeyConfig}
     * @memberof PieOptions
     */
    keyConfig?: PieOptionsKeyConfig;
    /**
     * 
     * @type {PieOptionsValueConfig}
     * @memberof PieOptions
     */
    valueConfig?: PieOptionsValueConfig;
    /**
     * 
     * @type {PieOptionsPieConfig}
     * @memberof PieOptions
     */
    pieConfig?: PieOptionsPieConfig;
    /**
     * An escape hatch for visualization settings that do not yet have
     * a typed field of their own. Contents are stored and returned
     * unchanged and are not validated, so newer clients can round-trip
     * settings this version of the schema does not name.
     * 
     * @type {{ [key: string]: any | undefined; }}
     * @memberof PieOptions
     */
    extensions?: { [key: string]: any | undefined; };
}
/**
 * 
 * @export
 * @interface PieOptionsKeyConfig
 */
export interface PieOptionsKeyConfig {
    /**
     * 
     * @type {TopListOptionsKeyConfigOrder}
     * @memberof PieOptionsKeyConfig
     */
    order?: TopListOptionsKeyConfigOrder;
    /**
     * Collapse the slices beyond `limit` into a single
     * "Other" slice instead of dropping them.
     * 
     * @type {boolean}
     * @memberof PieOptionsKeyConfig
     */
    showOthers?: boolean;
    /**
     * 
     * @type {number}
     * @memberof PieOptionsKeyConfig
     */
    limit?: number;
    /**
     * 
     * @type {ColorConfig}
     * @memberof PieOptionsKeyConfig
     */
    color?: ColorConfig;
}


/**
 * 
 * @export
 * @interface PieOptionsPieConfig
 */
export interface PieOptionsPieConfig {
    /**
     * Hole size as a fraction of the outer radius. `0`
     * (the default) is a full pie; any larger value
     * renders a donut.
     * 
     * @type {number}
     * @memberof PieOptionsPieConfig
     */
    innerRadius?: number;
    /**
     * 
     * @type {boolean}
     * @memberof PieOptionsPieConfig
     */
    showValues?: boolean;
}
/**
 * 
 * @export
 * @interface PieOptionsValueConfig
 */
export interface PieOptionsValueConfig {
    /**
     * 
     * @type {CellNumberFormat}
     * @memberof PieOptionsValueConfig
     */
    format?: CellNumberFormat;
}
/**
 * 
 * @export
 * @interface PointAnnotation
 */
export interface PointAnnotation {
    /**
     * 
     * @type {string}
     * @memberof PointAnnotation
     */
    at: string;
    /**
     * 
     * @type {string}
     * @memberof PointAnnotation
     */
    label?: string;
    /**
     * 
     * @type {string}
     * @memberof PointAnnotation
     */
    color?: string;
}
/**
 * 
 * @export
 * @interface PollDelegatedLogin200Response
 */
export interface PollDelegatedLogin200Response {
    /**
     * Whether this HTTP request was valid (does not indicate completion status).
     * @type {boolean}
     * @memberof PollDelegatedLogin200Response
     */
    ok?: boolean;
    /**
     * If the request has been accepted, denied, or timed out (is settled) then this is true,
     * else if we need to poll again, it is false. If the request is not yet settled, the server
     * side will wait a bit before returning this response, which allows the client to easily
     * implement long polling.
     * 
     * @type {boolean}
     * @memberof PollDelegatedLogin200Response
     */
    settled: boolean;
    /**
     * The access key if the request has been accepted. If the request is settled but not
     * accepted, it will be empty. Note that only the first request after the login is settled
     * will contain the access key, because it is generated once and not stored server side
     * (only a hash is stored, for later API request authentication.) This key imbues the same
     * powers in the Observe API as are available to the issuing user.
     * 
     * @type {string}
     * @memberof PollDelegatedLogin200Response
     */
    accessKey?: string;
    /**
     * A message from the server. In case of error, this may be helpful to display to the user.
     * 
     * @type {string}
     * @memberof PollDelegatedLogin200Response
     */
    message?: string;
}
/**
 * Match an IPv4 address column against CIDR ranges. Each `value` is a
 * CIDR string, and each may be included or excluded.
 * 
 * @export
 * @interface PredicateCidr
 */
export interface PredicateCidr {
    /**
     * A list of discrete values, each either included or excluded. Every value
     * is carried as a string: write numbers as decimal strings (which keeps
     * full int64 precision) and booleans as `"true"` / `"false"`. Values are
     * cast back to the column's type when the filter runs. A JSON `null` value
     * matches the OPAL null.
     * 
     * @type {Array<IncludeExcludeValuesInner>}
     * @memberof PredicateCidr
     */
    values: Array<IncludeExcludeValuesInner>;
}
/**
 * Keep only rows that have a matching row in another dataset. A row is
 * kept when it joins, on `joinKey`, to the input named by `inputLabel`.
 * 
 * @export
 * @interface PredicateExists
 */
export interface PredicateExists {
    /**
     * 
     * @type {JoinKey}
     * @memberof PredicateExists
     */
    joinKey: JoinKey;
    /**
     * Name of the input holding the dataset to join against, as declared
     * in the card's list of inputs.
     * 
     * @type {string}
     * @memberof PredicateExists
     */
    inputLabel?: string;
    /**
     * Evaluate the join as a streaming existence check. Default `false`.
     * Omit when default.
     * 
     * @type {boolean}
     * @memberof PredicateExists
     */
    streaming?: boolean;
}
/**
 * A raw OPAL boolean condition, for filters the other predicates cannot
 * express. The condition is stored as an opaque string and is not parsed
 * or validated here. Supply the boolean expression on its own, without a
 * surrounding filter verb — the verb comes from the enclosing
 * `FilterRule`.
 * 
 * @export
 * @interface PredicateFilterCondition
 */
export interface PredicateFilterCondition {
    /**
     * OPAL boolean expression, without a surrounding filter verb.
     * @type {string}
     * @memberof PredicateFilterCondition
     */
    condition: string;
    /**
     * A condition that is currently turned off, retained in the document
     * so it can be restored later.
     * 
     * @type {string}
     * @memberof PredicateFilterCondition
     */
    disabledCondition?: string;
}
/**
 * Match values at one or more JSON paths inside an object, variant, or
 * JSON column. Values listed under the same path are OR-ed together;
 * `combine` controls how the separate paths combine with each other.
 * 
 * @export
 * @interface PredicateJsonValues
 */
export interface PredicateJsonValues {
    /**
     * 
     * @type {PredicateJsonValuesCombine}
     * @memberof PredicateJsonValues
     */
    combine?: PredicateJsonValuesCombine;
    /**
     * 
     * @type {Array<PredicateJsonValuesPathsInner>}
     * @memberof PredicateJsonValues
     */
    paths: Array<PredicateJsonValuesPathsInner>;
}


/**
 * How to combine across paths. Default `and`.
 * @export
 * @enum {string}
 */
export enum PredicateJsonValuesCombine {
    And = 'and',
    Or = 'or'
}

/**
 * 
 * @export
 * @interface PredicateJsonValuesPathsInner
 */
export interface PredicateJsonValuesPathsInner {
    /**
     * 
     * @type {string}
     * @memberof PredicateJsonValuesPathsInner
     */
    path: string;
    /**
     * Exclude (negate) this whole path. Default `false`.
     * @type {boolean}
     * @memberof PredicateJsonValuesPathsInner
     */
    excludePath?: boolean;
    /**
     * A list of discrete values, each either included or excluded. Every value
     * is carried as a string: write numbers as decimal strings (which keeps
     * full int64 precision) and booleans as `"true"` / `"false"`. Values are
     * cast back to the column's type when the filter runs. A JSON `null` value
     * matches the OPAL null.
     * 
     * @type {Array<IncludeExcludeValuesInner>}
     * @memberof PredicateJsonValuesPathsInner
     */
    values: Array<IncludeExcludeValuesInner>;
}
/**
 * Filter on combinations of several columns or paths at once. Each entry in
 * `rows` is one allowed combination — or, with `exclude`, one disallowed
 * combination — whose values line up positionally with `fields`.
 * 
 * @export
 * @interface PredicateMultiColumn
 */
export interface PredicateMultiColumn {
    /**
     * 
     * @type {Array<PredicateMultiColumnFieldsInner>}
     * @memberof PredicateMultiColumn
     */
    fields: Array<PredicateMultiColumnFieldsInner>;
    /**
     * 
     * @type {Array<Array<string | null>>}
     * @memberof PredicateMultiColumn
     */
    rows: Array<Array<string | null>>;
    /**
     * Exclude the listed tuples instead of including them. Default `false`.
     * @type {boolean}
     * @memberof PredicateMultiColumn
     */
    exclude?: boolean;
}
/**
 * 
 * @export
 * @interface PredicateMultiColumnFieldsInner
 */
export interface PredicateMultiColumnFieldsInner {
    /**
     * 
     * @type {string}
     * @memberof PredicateMultiColumnFieldsInner
     */
    columnId: string;
    /**
     * 
     * @type {string}
     * @memberof PredicateMultiColumnFieldsInner
     */
    path?: string;
}
/**
 * Bind a column filter to one or more dashboard or worksheet parameters.
 * The values to filter on come from those parameters at query time, so the
 * filter follows whatever a viewer selects.
 * 
 * @export
 * @interface PredicateParameter
 */
export interface PredicateParameter {
    /**
     * 
     * @type {Array<PredicateParameterParametersInner>}
     * @memberof PredicateParameter
     */
    parameters: Array<PredicateParameterParametersInner>;
    /**
     * Correlation-tag id, when the bound filter targets a tag.
     * @type {string}
     * @memberof PredicateParameter
     */
    tagId?: string;
    /**
     * Kind of the dataset being filtered (e.g. `Event`, `Resource`). The
     * rule picks its OPAL filter verb from this, because a resource
     * dataset filters differently than an event dataset. Omit for a
     * plain row filter.
     * 
     * @type {string}
     * @memberof PredicateParameter
     */
    datasetKind?: string;
    /**
     * Whether to cast the bound parameter value to the column's type
     * before comparing. Set `false` to compare the value as it is, with no
     * type coercion. Default `true`. Omit when default.
     * 
     * @type {boolean}
     * @memberof PredicateParameter
     */
    castToColumnType?: boolean;
}
/**
 * 
 * @export
 * @interface PredicateParameterParametersInner
 */
export interface PredicateParameterParametersInner {
    /**
     * 
     * @type {string}
     * @memberof PredicateParameterParametersInner
     */
    parameterId: string;
    /**
     * Filter against a path within an object/variant column.
     * @type {string}
     * @memberof PredicateParameterParametersInner
     */
    columnPath?: string;
    /**
     * For a resource-instance parameter, filter against one of its
     * key fields rather than the whole instance.
     * 
     * @type {string}
     * @memberof PredicateParameterParametersInner
     */
    resourceInstanceField?: string;
}
/**
 * Filter by log or data pattern cluster. Each `value` is a pattern
 * identifier produced by an earlier pattern-extraction stage in the
 * pipeline.
 * 
 * @export
 * @interface PredicatePattern
 */
export interface PredicatePattern {
    /**
     * A list of discrete values, each either included or excluded. Every value
     * is carried as a string: write numbers as decimal strings (which keeps
     * full int64 precision) and booleans as `"true"` / `"false"`. Values are
     * cast back to the column's type when the filter runs. A JSON `null` value
     * matches the OPAL null.
     * 
     * @type {Array<IncludeExcludeValuesInner>}
     * @memberof PredicatePattern
     */
    values: Array<IncludeExcludeValuesInner>;
}
/**
 * Keep rows whose column value falls in a numeric, time, or duration
 * range. `start` and `end` are inclusive by default; either may be null
 * for an open-ended range.
 * 
 * @export
 * @interface PredicateRange
 */
export interface PredicateRange {
    /**
     * 
     * @type {number}
     * @memberof PredicateRange
     */
    start?: number | null;
    /**
     * 
     * @type {number}
     * @memberof PredicateRange
     */
    end?: number | null;
    /**
     * OPAL duration unit for `start` on duration columns (e.g. `ns`).
     * @type {string}
     * @memberof PredicateRange
     */
    startUnit?: string;
    /**
     * OPAL duration unit for `end` on duration columns.
     * @type {string}
     * @memberof PredicateRange
     */
    endUnit?: string;
    /**
     * Use `>` instead of `>=` for `start`. Default `false`.
     * @type {boolean}
     * @memberof PredicateRange
     */
    startExclusive?: boolean;
    /**
     * Use `<` instead of `<=` for `end`. Default `false`.
     * @type {boolean}
     * @memberof PredicateRange
     */
    endExclusive?: boolean;
    /**
     * Filter out the range instead (wraps in `not (...)`). Default `false`.
     * @type {boolean}
     * @memberof PredicateRange
     */
    invert?: boolean;
    /**
     * Second column, for comparing one interval against another — for
     * example filtering on a resource's validity window, where the range
     * spans from `column` to `toColumnId`.
     * 
     * @type {string}
     * @memberof PredicateRange
     */
    toColumnId?: string;
}
/**
 * Narrow the results to specific resource instances. Each instance is
 * identified by its primary-key column/value pairs.
 * 
 * @export
 * @interface PredicateResourceInstance
 */
export interface PredicateResourceInstance {
    /**
     * 
     * @type {Array<PredicateResourceInstanceInstancesInner>}
     * @memberof PredicateResourceInstance
     */
    instances: Array<PredicateResourceInstanceInstancesInner>;
}
/**
 * 
 * @export
 * @interface PredicateResourceInstanceInstancesInner
 */
export interface PredicateResourceInstanceInstancesInner {
    /**
     * 
     * @type {Array<PredicateResourceInstanceInstancesInnerResourceIdInner>}
     * @memberof PredicateResourceInstanceInstancesInner
     */
    resourceId: Array<PredicateResourceInstanceInstancesInnerResourceIdInner>;
    /**
     * Exclude this instance instead of including it. Default `false`.
     * @type {boolean}
     * @memberof PredicateResourceInstanceInstancesInner
     */
    exclude?: boolean;
}
/**
 * 
 * @export
 * @interface PredicateResourceInstanceInstancesInnerResourceIdInner
 */
export interface PredicateResourceInstanceInstancesInnerResourceIdInner {
    /**
     * 
     * @type {string}
     * @memberof PredicateResourceInstanceInstancesInnerResourceIdInner
     */
    name: string;
    /**
     * 
     * @type {string}
     * @memberof PredicateResourceInstanceInstancesInnerResourceIdInner
     */
    value: string | null;
}
/**
 * Filter on the values of a correlation tag. Name the tag with `tagName`,
 * `tagId`, or both. To negate the filter, mark the individual entries in
 * `values` as excluded.
 * 
 * @export
 * @interface PredicateTag
 */
export interface PredicateTag {
    /**
     * 
     * @type {string}
     * @memberof PredicateTag
     */
    tagName?: string;
    /**
     * 
     * @type {string}
     * @memberof PredicateTag
     */
    tagId?: string;
    /**
     * A list of discrete values, each either included or excluded. Every value
     * is carried as a string: write numbers as decimal strings (which keeps
     * full int64 precision) and booleans as `"true"` / `"false"`. Values are
     * cast back to the column's type when the filter runs. A JSON `null` value
     * matches the OPAL null.
     * 
     * @type {Array<IncludeExcludeValuesInner>}
     * @memberof PredicateTag
     */
    values: Array<IncludeExcludeValuesInner>;
}
/**
 * Match text against the column, or across the whole row when
 * `FilterRule.column` is absent. `match` chooses the syntax — substring,
 * glob, regular expression, free-text search, or token lookup — and with
 * it the OPAL function the rule compiles to. `match` is always stored
 * explicitly and is never guessed from the shape of the terms.
 * 
 * @export
 * @interface PredicateText
 */
export interface PredicateText {
    /**
     * 
     * @type {PredicateTextMatch}
     * @memberof PredicateText
     */
    match: PredicateTextMatch;
    /**
     * Only for the `contains` match. Default `true`.
     * @type {boolean}
     * @memberof PredicateText
     */
    caseSensitive?: boolean;
    /**
     * 
     * @type {Array<TextMatchTermsInner>}
     * @memberof PredicateText
     */
    terms: Array<TextMatchTermsInner>;
    /**
     * Term groups scoped to individual JSON paths. Only for
     * `match: regex` and `match: search`; each entry applies its terms to
     * one path within the column instead of the column as a whole.
     * 
     * @type {Array<PredicateTextPathsInner>}
     * @memberof PredicateText
     */
    paths?: Array<PredicateTextPathsInner>;
}


/**
 * - contains — substring via `contains()` (case-sensitive) or `search()` (see `caseSensitive`)
 * - glob     — glob `~` / `!~`
 * - regex    — regular expression
 * - search   — free-text `search()` term (unified search)
 * - tokens   — token-index lookup
 * 
 * @export
 * @enum {string}
 */
export enum PredicateTextMatch {
    Contains = 'contains',
    Glob = 'glob',
    Regex = 'regex',
    Search = 'search',
    Tokens = 'tokens'
}

/**
 * 
 * @export
 * @interface PredicateTextPathsInner
 */
export interface PredicateTextPathsInner {
    /**
     * 
     * @type {string}
     * @memberof PredicateTextPathsInner
     */
    path: string;
    /**
     * 
     * @type {Array<TextMatchTermsInner>}
     * @memberof PredicateTextPathsInner
     */
    terms: Array<TextMatchTermsInner>;
}
/**
 * Match the column against a list of discrete values.
 * @export
 * @interface PredicateValues
 */
export interface PredicateValues {
    /**
     * A list of discrete values, each either included or excluded. Every value
     * is carried as a string: write numbers as decimal strings (which keeps
     * full int64 precision) and booleans as `"true"` / `"false"`. Values are
     * cast back to the column's type when the filter runs. A JSON `null` value
     * matches the OPAL null.
     * 
     * @type {Array<IncludeExcludeValuesInner>}
     * @memberof PredicateValues
     */
    values: Array<IncludeExcludeValuesInner>;
}
/**
 * 
 * @export
 * @interface PrimitiveValue
 */
export interface PrimitiveValue {
    /**
     * 
     * @type {boolean}
     * @memberof PrimitiveValue
     */
    bool?: boolean;
    /**
     * 
     * @type {number}
     * @memberof PrimitiveValue
     */
    float64?: number;
    /**
     * 
     * @type {string}
     * @memberof PrimitiveValue
     */
    int64?: string;
    /**
     * 
     * @type {string}
     * @memberof PrimitiveValue
     */
    string?: string;
    /**
     * 
     * @type {string}
     * @memberof PrimitiveValue
     */
    timestamp?: string;
    /**
     * 
     * @type {string}
     * @memberof PrimitiveValue
     */
    duration?: string;
    /**
     * 
     * @type {Array<PrimitiveValue>}
     * @memberof PrimitiveValue
     */
    array?: Array<PrimitiveValue>;
    /**
     * 
     * @type {PrimitiveValueLink}
     * @memberof PrimitiveValue
     */
    link?: PrimitiveValueLink;
    /**
     * 
     * @type {PrimitiveValueDatasetref}
     * @memberof PrimitiveValue
     */
    datasetref?: PrimitiveValueDatasetref;
}
/**
 * 
 * @export
 * @interface PrimitiveValueDatasetref
 */
export interface PrimitiveValueDatasetref {
    /**
     * 
     * @type {string}
     * @memberof PrimitiveValueDatasetref
     */
    datasetId?: string;
    /**
     * 
     * @type {string}
     * @memberof PrimitiveValueDatasetref
     */
    datasetPath?: string;
    /**
     * 
     * @type {string}
     * @memberof PrimitiveValueDatasetref
     */
    stageId?: string;
}
/**
 * 
 * @export
 * @interface PrimitiveValueLink
 */
export interface PrimitiveValueLink {
    /**
     * 
     * @type {string}
     * @memberof PrimitiveValueLink
     */
    datasetId?: string;
    /**
     * 
     * @type {Array<PrimitiveValueLinkPrimaryKeyValueInner>}
     * @memberof PrimitiveValueLink
     */
    primaryKeyValue?: Array<PrimitiveValueLinkPrimaryKeyValueInner>;
    /**
     * 
     * @type {string}
     * @memberof PrimitiveValueLink
     */
    storedLabel?: string;
}
/**
 * 
 * @export
 * @interface PrimitiveValueLinkPrimaryKeyValueInner
 */
export interface PrimitiveValueLinkPrimaryKeyValueInner {
    /**
     * 
     * @type {string}
     * @memberof PrimitiveValueLinkPrimaryKeyValueInner
     */
    name?: string;
}
/**
 * A query card: an OPAL pipeline run over one or more data inputs and
 * rendered as a visualization. This is the default card type in both
 * dashboards and worksheets.
 * 
 * A card carries either a single `visualization` or, when each
 * expression in the query is charted separately, a `multiVisualization`
 * array. Exactly one of the two is present.
 * 
 * @export
 * @interface Query
 */
export interface Query {
    /**
     * 
     * @type {any}
     * @memberof Query
     */
    type?: any | null;
    /**
     * Optional. Required only when another card references this one
     * as an input (`Input.source.card`), or when it appears in a
     * dashboard's `hiddenQueries`. Any non-empty string; the format
     * is not constrained. Ids are stored exactly as sent, so
     * references to them from inside the opaque
     * `content.builderDef.ui` stay valid.
     * 
     * @type {string}
     * @memberof Query
     */
    id?: string;
    /**
     * Optional. User-authored card title. Omit when the card is
     * unnamed; clients synthesize a display name (e.g. "Untitled
     * Stage N") and must not persist that placeholder. Empty
     * string is invalid — absence is omission. Hidden / base
     * queries are identified by `id`, not by label. (Grid
     * placement lives on the wrapping `Card.geometry`, not here.)
     * 
     * @type {string}
     * @memberof Query
     */
    label?: string;
    /**
     * 
     * @type {FrontendTimeRange}
     * @memberof Query
     */
    timeRange?: FrontendTimeRange;
    /**
     * 
     * @type {CardContent}
     * @memberof Query
     */
    content: CardContent;
    /**
     * 
     * @type {Visualization}
     * @memberof Query
     */
    visualization?: Visualization;
    /**
     * One visualization per expression, for a card whose query has
     * several expressions and charts each one separately. Each entry
     * pairs an expression id (`A`, `B`, ...) with its visualization —
     * for example a dual-axis chart where `A` is a line and `B` is a
     * bar. Present instead of `visualization`.
     * 
     * @type {Array<QueryMultiVisualizationInner>}
     * @memberof Query
     */
    multiVisualization?: Array<QueryMultiVisualizationInner>;
    /**
     * 
     * @type {Array<Drilldown>}
     * @memberof Query
     */
    drilldowns?: Array<Drilldown>;
    /**
     * Opaque card-level UI state, stored and returned unchanged. Must be
     * a JSON object; its contents are not validated.
     * 
     * @type {{ [key: string]: any | undefined; }}
     * @memberof Query
     */
    ui?: { [key: string]: any | undefined; };
}
/**
 * 
 * @export
 * @interface QueryMultiVisualizationInner
 */
export interface QueryMultiVisualizationInner {
    /**
     * The expression id this visualization renders.
     * @type {string}
     * @memberof QueryMultiVisualizationInner
     */
    expression: string;
    /**
     * 
     * @type {Visualization}
     * @memberof QueryMultiVisualizationInner
     */
    visualization: Visualization;
}
/**
 * 
 * @export
 * @interface QueryReferenceTables200Response
 */
export interface QueryReferenceTables200Response {
    /**
     * Total number of reference tables available, independent of pagination
     * @type {number}
     * @memberof QueryReferenceTables200Response
     */
    totalCount: number;
    /**
     * List of reference tables that match the query and pagination filters
     * @type {Array<ReferenceTablesTable>}
     * @memberof QueryReferenceTables200Response
     */
    referenceTables: Array<ReferenceTablesTable>;
}
/**
 * 
 * @export
 * @interface RangeAnnotation
 */
export interface RangeAnnotation {
    /**
     * 
     * @type {string}
     * @memberof RangeAnnotation
     */
    from: string;
    /**
     * 
     * @type {string}
     * @memberof RangeAnnotation
     */
    to: string;
    /**
     * 
     * @type {string}
     * @memberof RangeAnnotation
     */
    label?: string;
    /**
     * 
     * @type {string}
     * @memberof RangeAnnotation
     */
    color?: string;
}
/**
 * Reference to an RBAC group, including id, label, and description.
 * @export
 * @interface RbacGroupRef
 */
export interface RbacGroupRef {
    /**
     * 
     * @type {string}
     * @memberof RbacGroupRef
     */
    id: string;
    /**
     * Deprecated. For compatibility with legacy APIs.
     * @type {string}
     * @memberof RbacGroupRef
     * @deprecated
     */
    legacyId: string;
    /**
     * 
     * @type {string}
     * @memberof RbacGroupRef
     */
    label: string;
    /**
     * 
     * @type {string}
     * @memberof RbacGroupRef
     */
    description: string;
}
/**
 * 
 * @export
 * @interface ReferenceTablesField
 */
export interface ReferenceTablesField {
    /**
     * The name of the field
     * @type {string}
     * @memberof ReferenceTablesField
     */
    name: string;
    /**
     * The type of the field (e.g., string, float64, array)
     * @type {string}
     * @memberof ReferenceTablesField
     */
    type: string;
}
/**
 * 
 * @export
 * @interface ReferenceTablesMessageResponse
 */
export interface ReferenceTablesMessageResponse {
    /**
     * Success message
     * @type {string}
     * @memberof ReferenceTablesMessageResponse
     */
    message: string;
}
/**
 * 
 * @export
 * @interface ReferenceTablesTable
 */
export interface ReferenceTablesTable {
    /**
     * 
     * @type {string}
     * @memberof ReferenceTablesTable
     */
    id?: string;
    /**
     * 
     * @type {string}
     * @memberof ReferenceTablesTable
     */
    label?: string;
    /**
     * 
     * @type {string}
     * @memberof ReferenceTablesTable
     */
    description?: string;
    /**
     * 
     * @type {string}
     * @memberof ReferenceTablesTable
     */
    iconUrl?: string;
    /**
     * 
     * @type {string}
     * @memberof ReferenceTablesTable
     */
    managedById?: string;
    /**
     * 
     * @type {string}
     * @memberof ReferenceTablesTable
     */
    customerId?: string;
    /**
     * 
     * @type {string}
     * @memberof ReferenceTablesTable
     */
    createdAt?: string;
    /**
     * 
     * @type {User}
     * @memberof ReferenceTablesTable
     */
    createdBy?: User;
    /**
     * 
     * @type {string}
     * @memberof ReferenceTablesTable
     */
    updatedAt?: string;
    /**
     * 
     * @type {User}
     * @memberof ReferenceTablesTable
     */
    updatedBy?: User;
    /**
     * 
     * @type {string}
     * @memberof ReferenceTablesTable
     */
    datasetId?: string;
    /**
     * 
     * @type {string}
     * @memberof ReferenceTablesTable
     */
    checksum?: string;
    /**
     * The schema definition of the reference table
     * @type {Array<ReferenceTablesField>}
     * @memberof ReferenceTablesTable
     */
    schema?: Array<ReferenceTablesField>;
    /**
     * The primary key columns of the reference table
     * @type {Array<string>}
     * @memberof ReferenceTablesTable
     */
    primaryKey?: Array<string>;
    /**
     * The field that should be used for the OPAL label
     * @type {string}
     * @memberof ReferenceTablesTable
     */
    labelField?: string;
}
/**
 * 
 * @export
 * @interface ReferenceTablesTableMetadata
 */
export interface ReferenceTablesTableMetadata {
    /**
     * The label of the reference table.
     * @type {string}
     * @memberof ReferenceTablesTableMetadata
     */
    label: string;
    /**
     * The description of the reference table.
     * @type {string}
     * @memberof ReferenceTablesTableMetadata
     */
    description?: string;
    /**
     * The primary key of the reference table.
     * @type {Array<string>}
     * @memberof ReferenceTablesTableMetadata
     */
    primaryKey?: Array<string>;
    /**
     * The field that should be used for the OPAL label.
     * @type {string}
     * @memberof ReferenceTablesTableMetadata
     */
    labelField?: string;
}
/**
 * 
 * @export
 * @interface ReferenceTablesTableMetadataPatch
 */
export interface ReferenceTablesTableMetadataPatch {
    /**
     * The label of the reference table.
     * @type {string}
     * @memberof ReferenceTablesTableMetadataPatch
     */
    label?: string | null;
    /**
     * The description of the reference table.
     * @type {string}
     * @memberof ReferenceTablesTableMetadataPatch
     */
    description?: string | null;
    /**
     * The primary key of the reference table.
     * @type {Array<string>}
     * @memberof ReferenceTablesTableMetadataPatch
     */
    primaryKey?: Array<string> | null;
}
/**
 * 
 * @export
 * @interface ScatterOptions
 */
export interface ScatterOptions {
    /**
     * 
     * @type {AxisConfig}
     * @memberof ScatterOptions
     */
    xConfig?: AxisConfig;
    /**
     * 
     * @type {AxisConfig}
     * @memberof ScatterOptions
     */
    yConfig?: AxisConfig;
    /**
     * 
     * @type {ColorConfig}
     * @memberof ScatterOptions
     */
    colorConfig?: ColorConfig;
    /**
     * 
     * @type {ScatterOptionsLabelConfig}
     * @memberof ScatterOptions
     */
    labelConfig?: ScatterOptionsLabelConfig;
    /**
     * 
     * @type {ScatterOptionsRadiusConfig}
     * @memberof ScatterOptions
     */
    radiusConfig?: ScatterOptionsRadiusConfig;
    /**
     * 
     * @type {boolean}
     * @memberof ScatterOptions
     */
    horizontal?: boolean;
    /**
     * An escape hatch for visualization settings that do not yet have
     * a typed field of their own. Contents are stored and returned
     * unchanged and are not validated, so newer clients can round-trip
     * settings this version of the schema does not name.
     * 
     * @type {{ [key: string]: any | undefined; }}
     * @memberof ScatterOptions
     */
    extensions?: { [key: string]: any | undefined; };
}
/**
 * 
 * @export
 * @interface ScatterOptionsLabelConfig
 */
export interface ScatterOptionsLabelConfig {
    /**
     * 
     * @type {FieldRef}
     * @memberof ScatterOptionsLabelConfig
     */
    field?: FieldRef;
}
/**
 * 
 * @export
 * @interface ScatterOptionsRadiusConfig
 */
export interface ScatterOptionsRadiusConfig {
    /**
     * 
     * @type {FieldRef}
     * @memberof ScatterOptionsRadiusConfig
     */
    field?: FieldRef;
    /**
     * 
     * @type {AxisBounds}
     * @memberof ScatterOptionsRadiusConfig
     */
    range?: AxisBounds;
    /**
     * 
     * @type {ScatterOptionsRadiusConfigScaleType}
     * @memberof ScatterOptionsRadiusConfig
     */
    scaleType?: ScatterOptionsRadiusConfigScaleType;
    /**
     * 
     * @type {ScatterOptionsRadiusConfigFillType}
     * @memberof ScatterOptionsRadiusConfig
     */
    fillType?: ScatterOptionsRadiusConfigFillType;
}


/**
 * 
 * @export
 * @enum {string}
 */
export enum ScatterOptionsRadiusConfigFillType {
    Solid = 'solid',
    None = 'none',
    Translucent = 'translucent'
}

/**
 * 
 * @export
 * @enum {string}
 */
export enum ScatterOptionsRadiusConfigScaleType {
    Log = 'log',
    Linear = 'linear'
}

/**
 * 
 * @export
 * @interface Section
 */
export interface Section {
    /**
     * 
     * @type {string}
     * @memberof Section
     */
    title: string;
    /**
     * Default `false`. Omit when default.
     * @type {boolean}
     * @memberof Section
     */
    collapsed?: boolean;
    /**
     * Id of a parameter that controls this section's visibility
     * (the "hide sections" feature). When that parameter has a
     * truthy value the section is hidden from viewers. Absent when
     * the section is always shown.
     * 
     * @type {string}
     * @memberof Section
     */
    hideParameter?: string;
    /**
     * 
     * @type {Array<Card>}
     * @memberof Section
     */
    cards: Array<Card>;
}
/**
 * 
 * @export
 * @enum {string}
 */
export enum SequentialColorScale {
    Blues = 'Blues',
    Greens = 'Greens',
    Greys = 'Greys',
    Oranges = 'Oranges',
    Purples = 'Purples',
    Reds = 'Reds',
    BuGn = 'BuGn',
    BuPu = 'BuPu',
    GnBu = 'GnBu',
    OrRd = 'OrRd',
    PuBu = 'PuBu',
    PuBuGn = 'PuBuGn',
    PuRd = 'PuRd',
    RdPu = 'RdPu',
    YlGn = 'YlGn',
    YlGnBu = 'YlGnBu',
    YlOrBr = 'YlOrBr',
    YlOrRd = 'YlOrRd',
    Viridis = 'Viridis',
    Inferno = 'Inferno',
    Magma = 'Magma',
    Plasma = 'Plasma',
    Warm = 'Warm',
    Cool = 'Cool',
    Cubehelix = 'Cubehelix',
    Turbo = 'Turbo',
    Cividis = 'Cividis'
}

/**
 * 
 * @export
 * @interface ServiceAccountCreateRequest
 */
export interface ServiceAccountCreateRequest {
    /**
     * 
     * @type {string}
     * @memberof ServiceAccountCreateRequest
     */
    label: string;
    /**
     * 
     * @type {string}
     * @memberof ServiceAccountCreateRequest
     */
    description?: string;
    /**
     * The external OAuth binding to create for this service account.
     * @type {ServiceAccountExternalOAuth}
     * @memberof ServiceAccountCreateRequest
     */
    externalOAuth?: ServiceAccountExternalOAuth;
}
/**
 * 
 * @export
 * @interface ServiceAccountExternalOAuth
 */
export interface ServiceAccountExternalOAuth {
    /**
     * 
     * @type {OAuthExternalIntegrationRef}
     * @memberof ServiceAccountExternalOAuth
     */
    integration: OAuthExternalIntegrationRef;
    /**
     * The external identity subject (JWT sub/oid claim) this service account is bound to.
     * @type {string}
     * @memberof ServiceAccountExternalOAuth
     */
    subject: string;
}
/**
 * 
 * @export
 * @interface ServiceAccountListResponse
 */
export interface ServiceAccountListResponse {
    /**
     * 
     * @type {Array<ServiceAccountResource>}
     * @memberof ServiceAccountListResponse
     */
    serviceAccounts: Array<ServiceAccountResource>;
    /**
     * 
     * @type {Meta}
     * @memberof ServiceAccountListResponse
     */
    meta: Meta;
}
/**
 * 
 * @export
 * @interface ServiceAccountResource
 */
export interface ServiceAccountResource {
    /**
     * 
     * @type {string}
     * @memberof ServiceAccountResource
     */
    id: string;
    /**
     * 
     * @type {string}
     * @memberof ServiceAccountResource
     */
    label: string;
    /**
     * 
     * @type {string}
     * @memberof ServiceAccountResource
     */
    description: string;
    /**
     * 
     * @type {User}
     * @memberof ServiceAccountResource
     */
    createdBy: User;
    /**
     * 
     * @type {string}
     * @memberof ServiceAccountResource
     */
    createdAt: string;
    /**
     * 
     * @type {User}
     * @memberof ServiceAccountResource
     */
    updatedBy: User;
    /**
     * 
     * @type {string}
     * @memberof ServiceAccountResource
     */
    updatedAt: string;
    /**
     * Whether the service account is disabled. Disabling a service account will delete all of its API tokens.
     * @type {boolean}
     * @memberof ServiceAccountResource
     */
    disabled: boolean;
    /**
     * Number of API tokens for this service account. Includes recently expired and disabled tokens. Only populated when the expand query parameter is set to true.
     * @type {number}
     * @memberof ServiceAccountResource
     */
    apiTokenCount?: number;
    /**
     * RBAC groups this service account belongs to. Only populated when the expand query parameter is set to true.
     * @type {Array<RbacGroupRef>}
     * @memberof ServiceAccountResource
     */
    rbacGroups?: Array<RbacGroupRef>;
    /**
     * 
     * @type {ServiceAccountExternalOAuth}
     * @memberof ServiceAccountResource
     */
    externalOAuth: ServiceAccountExternalOAuth | null;
}
/**
 * 
 * @export
 * @interface ServiceAccountUpdateRequest
 */
export interface ServiceAccountUpdateRequest {
    /**
     * 
     * @type {string}
     * @memberof ServiceAccountUpdateRequest
     */
    label?: string;
    /**
     * 
     * @type {string}
     * @memberof ServiceAccountUpdateRequest
     */
    description?: string;
    /**
     * Whether the service account is disabled. Disabling a service account will delete all of its API tokens.
     * @type {boolean}
     * @memberof ServiceAccountUpdateRequest
     */
    disabled?: boolean;
    /**
     * 
     * @type {ServiceAccountExternalOAuth}
     * @memberof ServiceAccountUpdateRequest
     */
    externalOAuth?: ServiceAccountExternalOAuth | null;
}
/**
 * 
 * @export
 * @interface SingleStatOptions
 */
export interface SingleStatOptions {
    /**
     * 
     * @type {SingleStatOptionsYConfig}
     * @memberof SingleStatOptions
     */
    yConfig?: SingleStatOptionsYConfig;
    /**
     * 
     * @type {SingleStatOptionsStyle}
     * @memberof SingleStatOptions
     */
    style?: SingleStatOptionsStyle;
    /**
     * 
     * @type {SingleStatOptionsFacet}
     * @memberof SingleStatOptions
     */
    facet?: SingleStatOptionsFacet;
    /**
     * 
     * @type {SingleStatOptionsAggregation}
     * @memberof SingleStatOptions
     */
    aggregation?: SingleStatOptionsAggregation;
    /**
     * An escape hatch for visualization settings that do not yet have
     * a typed field of their own. Contents are stored and returned
     * unchanged and are not validated, so newer clients can round-trip
     * settings this version of the schema does not name.
     * 
     * @type {{ [key: string]: any | undefined; }}
     * @memberof SingleStatOptions
     */
    extensions?: { [key: string]: any | undefined; };
}


/**
 * 
 * @export
 * @enum {string}
 */
export enum SingleStatOptionsAggregation {
    LastNonNull = 'last-non-null',
    Last = 'last',
    FirstNonNull = 'first-non-null',
    First = 'first'
}

/**
 * 
 * @export
 * @interface SingleStatOptionsFacet
 */
export interface SingleStatOptionsFacet {
    /**
     * 
     * @type {SingleStatOptionsFacetSort}
     * @memberof SingleStatOptionsFacet
     */
    sort?: SingleStatOptionsFacetSort;
    /**
     * 
     * @type {number}
     * @memberof SingleStatOptionsFacet
     */
    limit?: number;
}


/**
 * 
 * @export
 * @enum {string}
 */
export enum SingleStatOptionsFacetSort {
    ValueAscending = 'value-ascending',
    ValueDescending = 'value-descending',
    NameAscending = 'name-ascending',
    NameDescending = 'name-descending'
}

/**
 * 
 * @export
 * @interface SingleStatOptionsStyle
 */
export interface SingleStatOptionsStyle {
    /**
     * 
     * @type {SingleStatOptionsStyleTextMode}
     * @memberof SingleStatOptionsStyle
     */
    textMode?: SingleStatOptionsStyleTextMode;
    /**
     * 
     * @type {SingleStatOptionsStyleTextAlignment}
     * @memberof SingleStatOptionsStyle
     */
    textAlignment?: SingleStatOptionsStyleTextAlignment;
    /**
     * 
     * @type {SingleStatOptionsStyleColorMode}
     * @memberof SingleStatOptionsStyle
     */
    colorMode?: SingleStatOptionsStyleColorMode;
    /**
     * 
     * @type {SingleStatOptionsStyleChartMode}
     * @memberof SingleStatOptionsStyle
     */
    chartMode?: SingleStatOptionsStyleChartMode;
    /**
     * 
     * @type {boolean}
     * @memberof SingleStatOptionsStyle
     */
    showPercentChange?: boolean;
    /**
     * 
     * @type {string}
     * @memberof SingleStatOptionsStyle
     */
    label?: string;
    /**
     * 
     * @type {number}
     * @memberof SingleStatOptionsStyle
     */
    valueFontSize?: number;
    /**
     * 
     * @type {number}
     * @memberof SingleStatOptionsStyle
     */
    groupFontSize?: number;
}


/**
 * 
 * @export
 * @enum {string}
 */
export enum SingleStatOptionsStyleChartMode {
    None = 'none',
    Line = 'line'
}

/**
 * 
 * @export
 * @enum {string}
 */
export enum SingleStatOptionsStyleColorMode {
    Value = 'value',
    None = 'none'
}

/**
 * 
 * @export
 * @enum {string}
 */
export enum SingleStatOptionsStyleTextAlignment {
    Center = 'center'
}

/**
 * 
 * @export
 * @enum {string}
 */
export enum SingleStatOptionsStyleTextMode {
    Value = 'value',
    Name = 'name'
}

/**
 * 
 * @export
 * @interface SingleStatOptionsYConfig
 */
export interface SingleStatOptionsYConfig {
    /**
     * 
     * @type {SingleStatOptionsYConfigDomain}
     * @memberof SingleStatOptionsYConfig
     */
    domain?: SingleStatOptionsYConfigDomain;
    /**
     * 
     * @type {CellNumberFormat}
     * @memberof SingleStatOptionsYConfig
     */
    format?: CellNumberFormat;
    /**
     * 
     * @type {ColorConfig}
     * @memberof SingleStatOptionsYConfig
     */
    color?: ColorConfig;
    /**
     * 
     * @type {boolean}
     * @memberof SingleStatOptionsYConfig
     */
    showRaw?: boolean;
}
/**
 * 
 * @export
 * @interface SingleStatOptionsYConfigDomain
 */
export interface SingleStatOptionsYConfigDomain {
    /**
     * 
     * @type {AxisBounds}
     * @memberof SingleStatOptionsYConfigDomain
     */
    range?: AxisBounds;
}
/**
 * 
 * @export
 * @interface SkillCreateRequest
 */
export interface SkillCreateRequest {
    /**
     * 
     * @type {string}
     * @memberof SkillCreateRequest
     */
    label: string;
    /**
     * 
     * @type {string}
     * @memberof SkillCreateRequest
     */
    description: string;
    /**
     * 
     * @type {string}
     * @memberof SkillCreateRequest
     */
    content: string;
    /**
     * 
     * @type {SkillVisibility}
     * @memberof SkillCreateRequest
     */
    visibility?: SkillVisibility;
}


/**
 * 
 * @export
 * @interface SkillListResponse
 */
export interface SkillListResponse {
    /**
     * 
     * @type {Array<SkillResource>}
     * @memberof SkillListResponse
     */
    skills: Array<SkillResource>;
    /**
     * 
     * @type {Meta}
     * @memberof SkillListResponse
     */
    meta: Meta;
}
/**
 * 
 * @export
 * @interface SkillResource
 */
export interface SkillResource {
    /**
     * 
     * @type {string}
     * @memberof SkillResource
     */
    id: string;
    /**
     * 
     * @type {string}
     * @memberof SkillResource
     */
    label: string;
    /**
     * 
     * @type {string}
     * @memberof SkillResource
     */
    description: string;
    /**
     * 
     * @type {string}
     * @memberof SkillResource
     */
    content?: string;
    /**
     * 
     * @type {SkillVisibility}
     * @memberof SkillResource
     */
    visibility: SkillVisibility;
    /**
     * 
     * @type {User}
     * @memberof SkillResource
     */
    createdBy: User;
    /**
     * 
     * @type {string}
     * @memberof SkillResource
     */
    createdAt: string;
    /**
     * 
     * @type {User}
     * @memberof SkillResource
     */
    updatedBy: User;
    /**
     * 
     * @type {string}
     * @memberof SkillResource
     */
    updatedAt: string;
}


/**
 * 
 * @export
 * @interface SkillUpdateRequest
 */
export interface SkillUpdateRequest {
    /**
     * 
     * @type {string}
     * @memberof SkillUpdateRequest
     */
    label?: string;
    /**
     * 
     * @type {string}
     * @memberof SkillUpdateRequest
     */
    description?: string;
    /**
     * 
     * @type {string}
     * @memberof SkillUpdateRequest
     */
    content?: string;
    /**
     * 
     * @type {SkillVisibility}
     * @memberof SkillUpdateRequest
     */
    visibility?: SkillVisibility;
}


/**
 * 
 * @export
 * @enum {string}
 */
export enum SkillVisibility {
    Listed = 'Listed',
    Unlisted = 'Unlisted'
}

/**
 * 
 * @export
 * @enum {string}
 */
export enum StackMode {
    Zero = 'zero',
    Center = 'center',
    Normalize = 'normalize'
}

/**
 * 
 * @export
 * @interface StagePresentationInput
 */
export interface StagePresentationInput {
    /**
     * 
     * @type {string}
     * @memberof StagePresentationInput
     */
    limit?: string;
    /**
     * Turn foreign keys into joined-name columns.
     * @type {boolean}
     * @memberof StagePresentationInput
     */
    linkify?: boolean;
    /**
     * How many timechart / aggregate buckets to use by default.
     * @type {string}
     * @memberof StagePresentationInput
     */
    wantBuckets?: string;
    /**
     * How to order the output data.
     * @type {Array<StagePresentationInputOrderColumnsInner>}
     * @memberof StagePresentationInput
     */
    orderColumns?: Array<StagePresentationInputOrderColumnsInner>;
}
/**
 * 
 * @export
 * @interface StagePresentationInputOrderColumnsInner
 */
export interface StagePresentationInputOrderColumnsInner {
    /**
     * 
     * @type {string}
     * @memberof StagePresentationInputOrderColumnsInner
     */
    columnName: string;
    /**
     * 
     * @type {boolean}
     * @memberof StagePresentationInputOrderColumnsInner
     */
    ascending?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof StagePresentationInputOrderColumnsInner
     */
    nullOrdering?: boolean;
}
/**
 * 
 * @export
 * @interface StageQuery
 */
export interface StageQuery {
    /**
     * 
     * @type {string}
     * @memberof StageQuery
     */
    id?: string;
    /**
     * 
     * @type {InputDefinition}
     * @memberof StageQuery
     */
    input: InputDefinition;
    /**
     * 
     * @type {string}
     * @memberof StageQuery
     */
    pipeline: string;
}
/**
 * 
 * @export
 * @interface StartDelegatedLogin200Response
 */
export interface StartDelegatedLogin200Response {
    /**
     * The URL to send the user to in a web browser.
     * @type {string}
     * @memberof StartDelegatedLogin200Response
     */
    url: string;
    /**
     * A token that can be used to poll the tenant for the status of the token creation.
     * This token has some authorization power (because it can be exchanged, once, for a
     * real token) so treat it carefully.
     * 
     * @type {string}
     * @memberof StartDelegatedLogin200Response
     */
    serverToken: string;
}
/**
 * 
 * @export
 * @interface StartDelegatedLogin400Response
 */
export interface StartDelegatedLogin400Response {
    /**
     * Whether this HTTP request was valid (does not indicate completion status).
     * @type {boolean}
     * @memberof StartDelegatedLogin400Response
     */
    ok?: boolean;
    /**
     * A message from the server. In case of error, this may be helpful to display to the user.
     * 
     * @type {string}
     * @memberof StartDelegatedLogin400Response
     */
    message?: string;
}
/**
 * 
 * @export
 * @interface StartDelegatedLoginRequest
 */
export interface StartDelegatedLoginRequest {
    /**
     * The email address of the user to mint credentials for.
     * @type {string}
     * @memberof StartDelegatedLoginRequest
     */
    userEmail: string;
    /**
     * A token generated by the client to identify this particular request.
     * We recommend a random alphanumeric string of length 24 characters or
     * more to avoid collisions. There is no power or security imbued into
     * this token, other than to tell different simultaneous authorization
     * requests for the same user apart.
     * 
     * @type {string}
     * @memberof StartDelegatedLoginRequest
     */
    clientToken: string;
    /**
     * The identifier of the particular integration making this request.
     * Integration should be configured in the Observe back-end, but there
     * is currently no UI for this, so you can use the ID of the Observe
     * command-line tool `observe-tool-abdaf0`.
     * 
     * @type {string}
     * @memberof StartDelegatedLoginRequest
     */
    integration: string;
}
/**
 * One distinct attribute value and the number of rows carrying it.
 * @export
 * @interface StatValueCount
 */
export interface StatValueCount {
    /**
     * The attribute value, always a JSON string regardless of the expression's
     * underlying type. Strings appear verbatim; ints as decimal digits (e.g.
     * `"41000234"`); bools as `"true"` or `"false"`; timestamps as RFC 3339
     * (e.g. `"2024-01-01T00:00:00Z"`).
     * 
     * @type {string}
     * @memberof StatValueCount
     */
    value: string;
    /**
     * Number of rows with this value.
     * @type {number}
     * @memberof StatValueCount
     */
    count: number;
}
/**
 * Expanded fields for a storage integration reference.
 * Present only when the parent resource is fetched with ?expand=true.
 * 
 * @export
 * @interface StorageIntegrationBrief
 */
export interface StorageIntegrationBrief {
    /**
     * 
     * @type {string}
     * @memberof StorageIntegrationBrief
     */
    label: string;
    /**
     * 
     * @type {StorageIntegrationType}
     * @memberof StorageIntegrationBrief
     */
    type: StorageIntegrationType;
    /**
     * 
     * @type {StorageIntegrationStorageProvider}
     * @memberof StorageIntegrationBrief
     */
    storageProvider: StorageIntegrationStorageProvider;
}


/**
 * A reference to a storage integration, used when embedded in other resources.
 * Always includes id. When the parent resource is fetched with ?expand=true,
 * the record object is present with label, type, and storageProvider.
 * 
 * @export
 * @interface StorageIntegrationRef
 */
export interface StorageIntegrationRef {
    /**
     * 
     * @type {string}
     * @memberof StorageIntegrationRef
     */
    readonly id: string;
    /**
     * 
     * @type {StorageIntegrationBrief}
     * @memberof StorageIntegrationRef
     */
    record?: StorageIntegrationBrief;
}
/**
 * 
 * @export
 * @enum {string}
 */
export enum StorageIntegrationStorageProvider {
    S3 = 'S3'
}

/**
 * 
 * @export
 * @enum {string}
 */
export enum StorageIntegrationType {
    Iceberg = 'Iceberg'
}

/**
 * 
 * @export
 * @interface TableConfig
 */
export interface TableConfig {
    /**
     * 
     * @type {TableConfigViewType}
     * @memberof TableConfig
     */
    viewType?: TableConfigViewType;
    /**
     * 
     * @type {{ [key: string]: number | undefined; }}
     * @memberof TableConfig
     */
    columnWidths?: { [key: string]: number | undefined; };
    /**
     * 
     * @type {{ [key: string]: boolean | undefined; }}
     * @memberof TableConfig
     */
    columnVisibility?: { [key: string]: boolean | undefined; };
    /**
     * 
     * @type {Array<string>}
     * @memberof TableConfig
     */
    columnOrder?: Array<string>;
    /**
     * Per-column conditional formatting rules. Keys are column
     * names. Absent columns have no special formatting.
     * 
     * @type {{ [key: string]: ColumnFormatting | undefined; }}
     * @memberof TableConfig
     */
    conditionalFormatting?: { [key: string]: ColumnFormatting | undefined; };
    /**
     * How the table's rows are sorted. Each entry sorts by one
     * result column, and earlier entries take precedence. This
     * sorts the presented result and does not change the card's
     * OPAL pipeline. Omit to leave the result in its natural
     * order.
     * 
     * @type {Array<TableConfigSortInner>}
     * @memberof TableConfig
     */
    sort?: Array<TableConfigSortInner>;
    /**
     * Maximum number of rows to show. This limits the presented
     * result and does not add a `limit` verb to the card's OPAL
     * pipeline. Omit to use the view default.
     * 
     * @type {number}
     * @memberof TableConfig
     */
    limit?: number;
}


/**
 * 
 * @export
 * @interface TableConfigSortInner
 */
export interface TableConfigSortInner {
    /**
     * 
     * @type {string}
     * @memberof TableConfigSortInner
     */
    column: string;
    /**
     * 
     * @type {boolean}
     * @memberof TableConfigSortInner
     */
    ascending: boolean;
}
/**
 * Row density and layout of the table. Default `auto`,
 * which picks a density based on the result. Omit when
 * default.
 * 
 * @export
 * @enum {string}
 */
export enum TableConfigViewType {
    Auto = 'auto',
    Flexible = 'flexible',
    Compact = 'compact',
    Log = 'log'
}

/**
 * Table presentation lives in `Visualization.tableConfig`; this
 * variant only carries the extensions escape hatch.
 * 
 * @export
 * @interface TableOptions
 */
export interface TableOptions {
    /**
     * An escape hatch for visualization settings that do not yet have
     * a typed field of their own. Contents are stored and returned
     * unchanged and are not validated, so newer clients can round-trip
     * settings this version of the schema does not name.
     * 
     * @type {{ [key: string]: any | undefined; }}
     * @memberof TableOptions
     */
    extensions?: { [key: string]: any | undefined; };
}
/**
 * Kind of tag.
 * @export
 * @enum {string}
 */
export enum TagKind {
    Metric = 'Metric',
    Correlation = 'Correlation'
}

/**
 * 
 * @export
 * @interface TagListResponse
 */
export interface TagListResponse {
    /**
     * 
     * @type {Array<TagResource>}
     * @memberof TagListResponse
     */
    tags: Array<TagResource>;
    /**
     * 
     * @type {Meta}
     * @memberof TagListResponse
     */
    meta: Meta;
}
/**
 * A single per-dataset definition of a tag.
 * 
 * @export
 * @interface TagMapping
 */
export interface TagMapping {
    /**
     * 
     * @type {DatasetRef}
     * @memberof TagMapping
     */
    dataset: DatasetRef;
    /**
     * 
     * @type {DatasetFieldPath}
     * @memberof TagMapping
     */
    path: DatasetFieldPath;
    /**
     * 
     * @type {DatasetRef}
     * @memberof TagMapping
     */
    origin: DatasetRef | null;
    /**
     * The discovery rule alias that created this mapping, or `null` when
     * the mapping was not created by a discovery rule. Only meaningful
     * for `kind=Correlation`; always `null` for `kind=Metric`. If the tag
     * is inherited from an upstream dataset, this field points to the
     * discovery rule alias that created the mapping on the origin
     * dataset.
     * 
     * @type {string}
     * @memberof TagMapping
     */
    discoveryRuleAlias: string | null;
    /**
     * 
     * @type {User}
     * @memberof TagMapping
     */
    createdBy: User | null;
}
/**
 * A tag (correlation or metric) along with every dataset that defines
 * it. Tags are identified by `(name, kind)`; there is no ObjectId for
 * a tag — `name` is the natural identifier within a kind.
 * 
 * @export
 * @interface TagResource
 */
export interface TagResource {
    /**
     * Tag name. Natural identifier within `kind`.
     * @type {string}
     * @memberof TagResource
     */
    name: string;
    /**
     * 
     * @type {TagKind}
     * @memberof TagResource
     */
    kind: TagKind;
    /**
     * Number of distinct datasets in which this tag is defined.
     * @type {number}
     * @memberof TagResource
     */
    datasetCount: number;
    /**
     * Per-dataset definitions of the tag. Always populated; use the
     * `mappings.exists(m, m.dataset.id == ...)` CEL quantifier to
     * filter tags scoped to a specific dataset.
     * 
     * Limited to 20 entries.
     * 
     * @type {Array<TagMapping>}
     * @memberof TagResource
     */
    mappings: Array<TagMapping>;
    /**
     * Up to 20 sample values observed for this tag, scoped to the
     * datasets the caller can view. Present only when the request sets
     * `sampleValues=true`. This is a bounded, non-paginated sample, NOT
     * the full value set; it may be empty or absent when values could
     * not be retrieved. Use `GET /v1/tags/values` to search values.
     * 
     * @type {Array<string>}
     * @memberof TagResource
     */
    sampleValues?: Array<string>;
}


/**
 * 
 * @export
 * @interface TagValuePair
 */
export interface TagValuePair {
    /**
     * Tag name.
     * @type {string}
     * @memberof TagValuePair
     */
    name: string;
    /**
     * Tag value.
     * @type {string}
     * @memberof TagValuePair
     */
    value: string;
    /**
     * 
     * @type {TagKind}
     * @memberof TagValuePair
     */
    kind: TagKind;
}


/**
 * 
 * @export
 * @interface TagValuesResponse
 */
export interface TagValuesResponse {
    /**
     * Tag name-value pairs matching the query and pagination.
     * @type {Array<TagValuePair>}
     * @memberof TagValuesResponse
     */
    tagValuePairs: Array<TagValuePair>;
    /**
     * 
     * @type {Meta}
     * @memberof TagValuesResponse
     */
    meta: Meta;
}
/**
 * `Regex`: treat `query` as a regular expression.
 * `Semantic`: use semantic search against `query`.
 * 
 * @export
 * @enum {string}
 */
export enum TagValuesSearchMode {
    Regex = 'Regex',
    Semantic = 'Semantic'
}

/**
 * 
 * @export
 * @interface TextMatchTermsInner
 */
export interface TextMatchTermsInner {
    /**
     * The match text: a substring, a glob, a regex, a search term, or a
     * single token, per the enclosing `match`.
     * 
     * @type {string}
     * @memberof TextMatchTermsInner
     */
    term: string;
    /**
     * Exclude rows matching this term instead of keeping them. Default
     * `false`. Must be `false` for the `contains` and `tokens` matches,
     * which support inclusion only.
     * 
     * @type {boolean}
     * @memberof TextMatchTermsInner
     */
    exclude?: boolean;
}
/**
 * 
 * @export
 * @interface Threshold
 */
export interface Threshold {
    /**
     * 
     * @type {number}
     * @memberof Threshold
     */
    value: number;
    /**
     * 
     * @type {ThresholdOp}
     * @memberof Threshold
     */
    op?: ThresholdOp;
    /**
     * 
     * @type {string}
     * @memberof Threshold
     */
    color: string;
    /**
     * 
     * @type {string}
     * @memberof Threshold
     */
    label?: string;
    /**
     * Default `false`. Omit when default.
     * @type {boolean}
     * @memberof Threshold
     */
    fillRegion?: boolean;
}


/**
 * Default `gt`. Omit when default.
 * @export
 * @enum {string}
 */
export enum ThresholdOp {
    Gt = 'gt',
    Lt = 'lt'
}

/**
 * Banded coloring driven by numeric thresholds: each band colors
 * values above its `value`. This is separate from
 * `Visualization.thresholds[]`, which draws threshold lines and
 * regions on a chart.
 * 
 * @export
 * @interface ThresholdsConfig
 */
export interface ThresholdsConfig {
    /**
     * A named swatch color or an arbitrary CSS color string.
     * @type {string}
     * @memberof ThresholdsConfig
     */
    startingColor: string;
    /**
     * A named swatch color or an arbitrary CSS color string.
     * @type {string}
     * @memberof ThresholdsConfig
     */
    defaultColor?: string;
    /**
     * 
     * @type {Array<ThresholdsConfigThresholdsInner>}
     * @memberof ThresholdsConfig
     */
    thresholds?: Array<ThresholdsConfigThresholdsInner> | null;
    /**
     * 
     * @type {ThresholdsConfigDrawType}
     * @memberof ThresholdsConfig
     */
    drawType?: ThresholdsConfigDrawType;
    /**
     * 
     * @type {ThresholdsConfigMode}
     * @memberof ThresholdsConfig
     */
    mode?: ThresholdsConfigMode;
    /**
     * 
     * @type {boolean}
     * @memberof ThresholdsConfig
     */
    visible?: boolean;
    /**
     * 
     * @type {ThresholdsConfigTarget}
     * @memberof ThresholdsConfig
     */
    target?: ThresholdsConfigTarget;
}


/**
 * 
 * @export
 * @enum {string}
 */
export enum ThresholdsConfigDrawType {
    Lines = 'Lines',
    DashedLines = 'Dashed lines',
    FilledRegions = 'Filled regions',
    FilledRegionsLines = 'Filled regions & lines',
    FilledRegionsDashedLines = 'Filled regions & dashed lines'
}

/**
 * 
 * @export
 * @enum {string}
 */
export enum ThresholdsConfigMode {
    Value = 'Value',
    Percentage = 'Percentage'
}

/**
 * Cell color target (table contexts).
 * @export
 * @enum {string}
 */
export enum ThresholdsConfigTarget {
    Text = 'text',
    Fill = 'fill',
    Pill = 'pill'
}

/**
 * 
 * @export
 * @interface ThresholdsConfigThresholdsInner
 */
export interface ThresholdsConfigThresholdsInner {
    /**
     * 
     * @type {number}
     * @memberof ThresholdsConfigThresholdsInner
     */
    value: number;
    /**
     * A named swatch color or an arbitrary CSS color string.
     * @type {string}
     * @memberof ThresholdsConfigThresholdsInner
     */
    exceedsColor: string;
}
/**
 * 
 * @export
 * @interface TopListOptions
 */
export interface TopListOptions {
    /**
     * 
     * @type {FieldRef}
     * @memberof TopListOptions
     */
    key?: FieldRef;
    /**
     * 
     * @type {FieldRef}
     * @memberof TopListOptions
     */
    value?: FieldRef;
    /**
     * 
     * @type {TopListOptionsViewConfig}
     * @memberof TopListOptions
     */
    viewConfig?: TopListOptionsViewConfig;
    /**
     * 
     * @type {TopListOptionsKeyConfig}
     * @memberof TopListOptions
     */
    keyConfig?: TopListOptionsKeyConfig;
    /**
     * 
     * @type {TopValueConfig}
     * @memberof TopListOptions
     */
    valueConfig?: TopValueConfig;
    /**
     * 
     * @type {TopListOptionsBarConfig}
     * @memberof TopListOptions
     */
    barConfig?: TopListOptionsBarConfig;
    /**
     * An escape hatch for visualization settings that do not yet have
     * a typed field of their own. Contents are stored and returned
     * unchanged and are not validated, so newer clients can round-trip
     * settings this version of the schema does not name.
     * 
     * @type {{ [key: string]: any | undefined; }}
     * @memberof TopListOptions
     */
    extensions?: { [key: string]: any | undefined; };
}
/**
 * 
 * @export
 * @interface TopListOptionsBarConfig
 */
export interface TopListOptionsBarConfig {
    /**
     * 
     * @type {number}
     * @memberof TopListOptionsBarConfig
     */
    bandSize?: number;
}
/**
 * 
 * @export
 * @interface TopListOptionsKeyConfig
 */
export interface TopListOptionsKeyConfig {
    /**
     * 
     * @type {string}
     * @memberof TopListOptionsKeyConfig
     */
    label?: string;
    /**
     * 
     * @type {TopListOptionsKeyConfigOrder}
     * @memberof TopListOptionsKeyConfig
     */
    order?: TopListOptionsKeyConfigOrder;
    /**
     * 
     * @type {boolean}
     * @memberof TopListOptionsKeyConfig
     */
    showOthers?: boolean;
    /**
     * 
     * @type {number}
     * @memberof TopListOptionsKeyConfig
     */
    limit?: number;
}


/**
 * 
 * @export
 * @enum {string}
 */
export enum TopListOptionsKeyConfigOrder {
    Descending = 'descending',
    Ascending = 'ascending'
}

/**
 * 
 * @export
 * @interface TopListOptionsViewConfig
 */
export interface TopListOptionsViewConfig {
    /**
     * 
     * @type {boolean}
     * @memberof TopListOptionsViewConfig
     */
    useSingleStatOnSingleGroup?: boolean;
}
/**
 * Value-axis config for TopList / ChangeOverTime.
 * @export
 * @interface TopValueConfig
 */
export interface TopValueConfig {
    /**
     * 
     * @type {AxisBounds}
     * @memberof TopValueConfig
     */
    range?: AxisBounds;
    /**
     * 
     * @type {LogScale}
     * @memberof TopValueConfig
     */
    scaleType?: LogScale;
    /**
     * 
     * @type {CellNumberFormat}
     * @memberof TopValueConfig
     */
    format?: CellNumberFormat;
    /**
     * 
     * @type {ColorConfig}
     * @memberof TopValueConfig
     */
    color?: ColorConfig;
    /**
     * 
     * @type {boolean}
     * @memberof TopValueConfig
     */
    showAxis?: boolean;
    /**
     * 
     * @type {string}
     * @memberof TopValueConfig
     */
    label?: string;
    /**
     * Optional aggregate op (TopList only).
     * @type {string}
     * @memberof TopValueConfig
     */
    aggregate?: string;
}
/**
 * 
 * @export
 * @interface UpdateReferenceTable200Response
 */
export interface UpdateReferenceTable200Response {
    /**
     * Success message
     * @type {string}
     * @memberof UpdateReferenceTable200Response
     */
    message: string;
}
/**
 * 
 * @export
 * @interface User
 */
export interface User {
    /**
     * 
     * @type {string}
     * @memberof User
     */
    id: string;
    /**
     * 
     * @type {string}
     * @memberof User
     */
    label?: string;
    /**
     * 
     * @type {string}
     * @memberof User
     */
    timezone?: string;
    /**
     * 
     * @type {string}
     * @memberof User
     */
    locale?: string;
}
/**
 * 
 * @export
 * @interface ValueKind
 */
export interface ValueKind {
    /**
     * 
     * @type {ValueKindKind}
     * @memberof ValueKind
     */
    kind: ValueKindKind;
    /**
     * Populated when `kind` is `resource`; absent otherwise.
     * @type {ValueKindResource}
     * @memberof ValueKind
     */
    resource?: ValueKindResource;
    /**
     * Populated when `kind` is `scalar`; absent otherwise.
     * @type {ValueKindScalar}
     * @memberof ValueKind
     */
    scalar?: ValueKindScalar;
    /**
     * Populated when `kind` is `correlationTag`; absent otherwise.
     * @type {ValueKindCorrelationTag}
     * @memberof ValueKind
     */
    correlationTag?: ValueKindCorrelationTag;
}


/**
 * Correlation tag parameter. The user selects one or more values
 * of a named correlation tag (e.g. `k8s.pod.name`). Expressions
 * bind to this parameter via `FilterParameter` actions.
 * 
 * @export
 * @interface ValueKindCorrelationTag
 */
export interface ValueKindCorrelationTag {
    /**
     * 
     * @type {string}
     * @memberof ValueKindCorrelationTag
     */
    tagName: string;
}
/**
 * 
 * @export
 * @enum {string}
 */
export enum ValueKindKind {
    Resource = 'resource',
    Scalar = 'scalar',
    CorrelationTag = 'correlationTag'
}

/**
 * A resource-instance parameter: the viewer picks one specific
 * resource — a row identified by its primary key — from a dataset.
 * `datasetId` may be absent for a parameter not yet bound to a
 * dataset; such a parameter is stored as-is, but cannot resolve a
 * value until a dataset is set.
 * 
 * @export
 * @interface ValueKindResource
 */
export interface ValueKindResource {
    /**
     * 
     * @type {string}
     * @memberof ValueKindResource
     */
    datasetId?: string;
}
/**
 * Scalar value parameter. The user enters or selects a simple
 * value (string, number, or boolean).
 * 
 * @export
 * @interface ValueKindScalar
 */
export interface ValueKindScalar {
    /**
     * 
     * @type {ValueKindScalarScalarType}
     * @memberof ValueKindScalar
     */
    scalarType: ValueKindScalarScalarType;
    /**
     * For select parameters (viewType `singleSelect` / `multiSelect`),
     * where the dropdown's candidate values come from. Absent for
     * free-entry (`textInput` / `numberInput`) parameters.
     * 
     * @type {ValueSource}
     * @memberof ValueKindScalar
     */
    valueSource?: ValueSource;
}


/**
 * 
 * @export
 * @enum {string}
 */
export enum ValueKindScalarScalarType {
    String = 'string',
    Number = 'number',
    Bool = 'bool'
}

/**
 * 
 * @export
 * @interface ValueSource
 */
export interface ValueSource {
    /**
     * 
     * @type {ValueSourceSource}
     * @memberof ValueSource
     */
    source: ValueSourceSource;
    /**
     * Populated when `source` is `custom`; absent otherwise.
     * @type {ValueSourceCustom}
     * @memberof ValueSource
     */
    custom?: ValueSourceCustom;
    /**
     * Populated when `source` is `dataset`; absent otherwise.
     * @type {ValueSourceDataset}
     * @memberof ValueSource
     */
    dataset?: ValueSourceDataset;
    /**
     * Populated when `source` is `card`; absent otherwise.
     * @type {ValueSourceCard}
     * @memberof ValueSource
     */
    card?: ValueSourceCard;
}


/**
 * Values are the distinct entries of a column in another card's
 * result.
 * 
 * @export
 * @interface ValueSourceCard
 */
export interface ValueSourceCard {
    /**
     * 
     * @type {string}
     * @memberof ValueSourceCard
     */
    cardId: string;
    /**
     * 
     * @type {string}
     * @memberof ValueSourceCard
     */
    columnId?: string;
}
/**
 * A fixed list of values, authored by hand.
 * @export
 * @interface ValueSourceCustom
 */
export interface ValueSourceCustom {
    /**
     * Map of value -> display label.
     * @type {{ [key: string]: string | undefined; }}
     * @memberof ValueSourceCustom
     */
    values: { [key: string]: string | undefined; };
}
/**
 * Values are the distinct entries of a column in a dataset.
 * 
 * @export
 * @interface ValueSourceDataset
 */
export interface ValueSourceDataset {
    /**
     * 
     * @type {string}
     * @memberof ValueSourceDataset
     */
    datasetId: string;
    /**
     * 
     * @type {string}
     * @memberof ValueSourceDataset
     */
    columnId?: string;
}
/**
 * 
 * @export
 * @enum {string}
 */
export enum ValueSourceSource {
    Custom = 'custom',
    Dataset = 'dataset',
    Card = 'card'
}

/**
 * How a query card's results are rendered. `type` picks the chart
 * type; `x`, `y`, and `groupBy` map result columns onto the
 * chart's axes and series; `legend`, `thresholds`, and
 * `annotations` apply to every chart type; and `options` carries
 * the settings specific to the chosen `type`.
 * 
 * @export
 * @interface Visualization
 */
export interface Visualization {
    /**
     * 
     * @type {VizType}
     * @memberof Visualization
     */
    type: VizType;
    /**
     * The result column plotted on the x-axis. Usually a plain
     * column id (`{type: column, column: "<id>"}`); use the
     * `link` form when the axis groups by a link or resource
     * rather than a single column.
     * 
     * @type {FieldRef}
     * @memberof Visualization
     */
    x?: FieldRef;
    /**
     * The result column or columns plotted on the y-axis.
     * Usually plain column ids
     * (`{type: column, column: "<id>"}`); an entry may use the
     * `link` form to address a link or resource by its source
     * fields.
     * 
     * @type {Array<FieldRef>}
     * @memberof Visualization
     */
    y?: Array<FieldRef>;
    /**
     * 
     * @type {Array<string>}
     * @memberof Visualization
     */
    groupBy?: Array<string>;
    /**
     * 
     * @type {LegendConfig}
     * @memberof Visualization
     */
    legend?: LegendConfig;
    /**
     * 
     * @type {Array<Threshold>}
     * @memberof Visualization
     */
    thresholds?: Array<Threshold>;
    /**
     * 
     * @type {Array<Annotation>}
     * @memberof Visualization
     */
    annotations?: Array<Annotation>;
    /**
     * Meaningful only when `type == "table"`.
     * @type {TableConfig}
     * @memberof Visualization
     */
    tableConfig?: TableConfig;
    /**
     * Settings specific to the chosen chart type — axis, color,
     * line, and bar configuration and so on. `options.type`
     * selects the variant and always matches
     * `Visualization.type`.
     * 
     * Anything that applies to every chart type lives at the
     * top level instead and is not repeated here: the `x`,
     * `y`, and `groupBy` encodings and the `legend`,
     * `thresholds`, and `annotations` settings. Each variant
     * also carries an `extensions` object for settings that do
     * not yet have a typed field.
     * 
     * @type {VisualizationOptions}
     * @memberof Visualization
     */
    options?: VisualizationOptions;
}


/**
 * 
 * @export
 * @interface VisualizationOptions
 */
export interface VisualizationOptions {
    /**
     * 
     * @type {VizType}
     * @memberof VisualizationOptions
     */
    type: VizType;
    /**
     * 
     * @type {LineOptions}
     * @memberof VisualizationOptions
     */
    line?: LineOptions;
    /**
     * 
     * @type {BarOptions}
     * @memberof VisualizationOptions
     */
    bar?: BarOptions;
    /**
     * 
     * @type {AreaOptions}
     * @memberof VisualizationOptions
     */
    area?: AreaOptions;
    /**
     * 
     * @type {ScatterOptions}
     * @memberof VisualizationOptions
     */
    scatter?: ScatterOptions;
    /**
     * 
     * @type {TableOptions}
     * @memberof VisualizationOptions
     */
    table?: TableOptions;
    /**
     * 
     * @type {SingleStatOptions}
     * @memberof VisualizationOptions
     */
    singleStat?: SingleStatOptions;
    /**
     * 
     * @type {HeatmapOptions}
     * @memberof VisualizationOptions
     */
    heatmap?: HeatmapOptions;
    /**
     * 
     * @type {TopListOptions}
     * @memberof VisualizationOptions
     */
    topList?: TopListOptions;
    /**
     * 
     * @type {ChangeOverTimeOptions}
     * @memberof VisualizationOptions
     */
    changeOverTime?: ChangeOverTimeOptions;
    /**
     * 
     * @type {AnomalyOptions}
     * @memberof VisualizationOptions
     */
    anomaly?: AnomalyOptions;
    /**
     * 
     * @type {CustomVegaOptions}
     * @memberof VisualizationOptions
     */
    customVega?: CustomVegaOptions;
    /**
     * 
     * @type {CustomVegaLiteOptions}
     * @memberof VisualizationOptions
     */
    customVegaLite?: CustomVegaLiteOptions;
    /**
     * 
     * @type {PieOptions}
     * @memberof VisualizationOptions
     */
    pie?: PieOptions;
    /**
     * Populated for every deprecated / D3-only `type`
     * (timeseries_deprecated, histogram, gantt, ...).
     * 
     * @type {LegacyD3Options}
     * @memberof VisualizationOptions
     */
    legacyD3?: LegacyD3Options;
}


/**
 * The chart type. Also selects which `VisualizationOptions`
 * variant applies — `Visualization.type` and
 * `VisualizationOptions.type` always match.
 * 
 * Types suffixed `_deprecated` are superseded by a current type
 * of the same shape (for example `line` supersedes
 * `timeseries_deprecated`) and SHOULD NOT be used in new
 * content. The types listed after them are specialized charts
 * that have no current equivalent and are not deprecated.
 * 
 * `anomaly` is read-only. The product has no editor for it, and
 * only the monitor view produces one. Preserve it when updating
 * a dashboard that already has one, but do not author it.
 * 
 * @export
 * @enum {string}
 */
export enum VizType {
    Line = 'line',
    Bar = 'bar',
    Area = 'area',
    Scatter = 'scatter',
    Table = 'table',
    SingleStat = 'singleStat',
    Heatmap = 'heatmap',
    TopList = 'topList',
    ChangeOverTime = 'changeOverTime',
    Anomaly = 'anomaly',
    CustomVega = 'customVega',
    CustomVegaLite = 'customVegaLite',
    Pie = 'pie',
    TimeseriesDeprecated = 'timeseries_deprecated',
    BarDeprecated = 'bar_deprecated',
    StackedAreaDeprecated = 'stacked_area_deprecated',
    SinglevalueDeprecated = 'singlevalue_deprecated',
    ListDeprecated = 'list_deprecated',
    ValueovertimeDeprecated = 'valueovertime_deprecated',
    StackedBarDeprecated = 'stacked_bar_deprecated',
    Circular = 'circular',
    Histogram = 'histogram',
    Gantt = 'gantt',
    ForceDisplacement = 'force_displacement',
    Dag = 'dag',
    GeographicMap = 'geographic_map',
    ChoroplethMap = 'choropleth_map',
    Flame = 'flame',
    Hex = 'hex',
    Waterfall = 'waterfall'
}

